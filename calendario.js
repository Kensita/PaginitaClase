(() => {
    const EVENTS_STORAGE_KEY = 'myroutine-events';
    const RECURRENCES = new Set(['none', 'daily', 'weekly', 'monthly']);
    const RECURRENCE_LABELS = {
        none: 'Una sola vez',
        daily: 'Cada día',
        weekly: 'Cada semana',
        monthly: 'Cada mes',
    };

    const monthTitle = document.getElementById('monthTitle');
    const calendarGrid = document.getElementById('calendarGrid');
    const selectedDateTitle = document.getElementById('selectedDateTitle');
    const eventList = document.getElementById('eventList');
    const emptyEvents = document.getElementById('emptyEvents');
    const calendarStatus = document.getElementById('calendarStatus');
    const eventForm = document.getElementById('eventForm');
    const eventFormTitle = document.getElementById('eventFormTitle');
    const eventFormError = document.getElementById('eventFormError');
    const titleInput = document.getElementById('eventTitle');
    const dateInput = document.getElementById('eventDate');
    const timeInput = document.getElementById('eventTime');
    const recurrenceInput = document.getElementById('eventRecurrence');
    const endDateInput = document.getElementById('eventEndDate');
    const endDateField = document.getElementById('endDateField');
    const addEventButton = document.getElementById('addEventButton');

    let todayKey = toDateKey(new Date());
    let selectedDateKey = todayKey;
    let currentMonth = parseDateKey(todayKey);
    let events = loadEvents();
    let editingEventId = null;

    function parseDateKey(key) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]) - 1;
        const day = Number(match[3]);
        const date = new Date(year, month, day, 12);
        if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null;
        return date;
    }

    function toDateKey(date) {
        const year = String(date.getFullYear()).padStart(4, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function refreshTodayKey() {
        const currentDateKey = toDateKey(new Date());
        if (currentDateKey === todayKey) return false;

        const previousTodayKey = todayKey;
        todayKey = currentDateKey;
        if (selectedDateKey === previousTodayKey) {
            selectedDateKey = currentDateKey;
            const today = parseDateKey(currentDateKey);
            currentMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12);
        }
        return true;
    }

    function scheduleTodayRefresh() {
        const now = new Date();
        const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
        const delay = Math.max(1, nextMidnight.getTime() - now.getTime());
        window.setTimeout(() => {
            if (refreshTodayKey()) render();
            scheduleTodayRefresh();
        }, delay);
    }

    function getMonthCells(year, monthIndex) {
        const firstDay = new Date(year, monthIndex, 1, 12);
        const daysInMonth = new Date(year, monthIndex + 1, 0, 12).getDate();
        const mondayOffset = (firstDay.getDay() + 6) % 7;
        const cellCount = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;
        const firstCell = new Date(year, monthIndex, 1 - mondayOffset, 12);
        const cells = [];

        for (let index = 0; index < cellCount; index += 1) {
            const date = new Date(firstCell.getFullYear(), firstCell.getMonth(), firstCell.getDate() + index, 12);
            cells.push({ dateKey: toDateKey(date), day: date.getDate(), inMonth: date.getMonth() === monthIndex });
        }
        return cells;
    }

    function formatDate(dateKey, options) {
        const date = parseDateKey(dateKey);
        if (!date) return '';
        return new Intl.DateTimeFormat('es-ES', options).format(date);
    }

    function loadEvents() {
        try {
            const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
            if (!raw) return [];
            const stored = JSON.parse(raw);
            if (!Array.isArray(stored)) return [];
            return stored.filter((event) => event
                && typeof event.id === 'string'
                && typeof event.title === 'string'
                && event.title.trim()
                && typeof event.startDate === 'string'
                && parseDateKey(event.startDate)
                && (event.time === undefined || typeof event.time === 'string')
                && RECURRENCES.has(event.recurrence)
                && (!event.endDate || (typeof event.endDate === 'string' && parseDateKey(event.endDate))));
        } catch (error) {
            console.warn('No se pudieron leer los eventos guardados.', error);
            return [];
        }
    }

    function saveEvents(nextEvents) {
        try {
            localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(nextEvents));
            return true;
        } catch (error) {
            console.warn('No se pudieron guardar los eventos.', error);
            return false;
        }
    }

    function updateStoredEvents(change) {
        const latestEvents = loadEvents();
        const nextEvents = change(latestEvents);
        if (nextEvents === null) {
            events = latestEvents;
            return 'missing';
        }
        if (!saveEvents(nextEvents)) {
            events = latestEvents;
            return 'storage-error';
        }
        events = nextEvents;
        return 'saved';
    }

    function getOccurrencesForDate(eventSeries, dateKey) {
        const date = parseDateKey(dateKey);
        if (!date) return [];

        return eventSeries.filter((event) => {
            const start = parseDateKey(event.startDate);
            if (!start || dateKey < event.startDate || (event.endDate && dateKey > event.endDate)) return false;

            if (event.recurrence === 'none') return dateKey === event.startDate;
            if (event.recurrence === 'daily') return true;
            if (event.recurrence === 'weekly') return date.getDay() === start.getDay();
            if (event.recurrence === 'monthly') {
                const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0, 12).getDate();
                return date.getDate() === Math.min(start.getDate(), lastDay);
            }
            return false;
        }).sort((first, second) => {
            if (!first.time && second.time) return -1;
            if (first.time && !second.time) return 1;
            return (first.time || '').localeCompare(second.time || '');
        });
    }

    function renderMonth() {
        const year = currentMonth.getFullYear();
        const monthIndex = currentMonth.getMonth();
        monthTitle.textContent = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })
            .format(currentMonth);
        calendarGrid.setAttribute('aria-label', `Días de ${monthTitle.textContent}`);
        calendarGrid.replaceChildren();

        getMonthCells(year, monthIndex).forEach((cell) => {
            const date = parseDateKey(cell.dateKey);
            const occurrences = getOccurrencesForDate(events, cell.dateKey);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `calendar-date${cell.inMonth ? '' : ' outside-month'}`;
            button.dataset.date = cell.dateKey;
            button.setAttribute('aria-label', `${formatDate(cell.dateKey, {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}${occurrences.length ? `, ${occurrences.length} ${occurrences.length === 1 ? 'evento' : 'eventos'}` : ''}`);
            button.setAttribute('aria-pressed', String(cell.dateKey === selectedDateKey));
            if (cell.dateKey === todayKey) button.setAttribute('aria-current', 'date');
            if (!cell.inMonth) button.classList.add('outside-month');

            const number = document.createElement('span');
            number.className = 'date-number';
            number.textContent = String(cell.day);
            button.appendChild(number);

            if (occurrences.length) {
                const dot = document.createElement('span');
                dot.className = 'calendar-event-dot';
                dot.setAttribute('aria-hidden', 'true');
                button.appendChild(dot);
            }
            calendarGrid.appendChild(button);
        });
    }

    function renderSelectedDay() {
        selectedDateTitle.textContent = formatDate(selectedDateKey, {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        });
        const occurrences = getOccurrencesForDate(events, selectedDateKey);
        eventList.replaceChildren();
        emptyEvents.hidden = occurrences.length > 0;

        occurrences.forEach((event) => {
            const item = document.createElement('li');
            item.className = 'event-item';

            const main = document.createElement('div');
            main.className = 'event-item-main';
            const mark = document.createElement('span');
            mark.className = 'event-item-mark';
            mark.setAttribute('aria-hidden', 'true');
            const copy = document.createElement('div');
            copy.className = 'event-item-copy';
            const title = document.createElement('div');
            title.className = 'event-item-title';
            title.textContent = event.title;
            const details = document.createElement('p');
            details.className = 'event-item-details';
            details.textContent = [event.time, RECURRENCE_LABELS[event.recurrence]].filter(Boolean).join(' · ');
            copy.append(title, details);
            main.append(mark, copy);

            const actions = document.createElement('div');
            actions.className = 'event-actions';
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.dataset.action = 'edit';
            editButton.dataset.eventId = event.id;
            editButton.setAttribute('aria-label', `Editar serie: ${event.title}`);
            editButton.textContent = 'Editar';
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.dataset.action = 'delete';
            deleteButton.dataset.eventId = event.id;
            deleteButton.setAttribute('aria-label', `Eliminar serie: ${event.title}`);
            deleteButton.textContent = 'Eliminar';
            actions.append(editButton, deleteButton);

            item.append(main, actions);
            eventList.appendChild(item);
        });
    }

    function render() {
        renderMonth();
        renderSelectedDay();
    }

    function setFormError(message) {
        eventFormError.textContent = message;
        eventFormError.hidden = !message;
    }

    function updateEndDateField() {
        const repeating = recurrenceInput.value !== 'none';
        endDateField.hidden = !repeating;
        endDateInput.required = false;
        endDateInput.min = dateInput.value || '';
        if (!repeating) endDateInput.value = '';
    }

    function openNewEventForm() {
        editingEventId = null;
        eventForm.reset();
        eventFormTitle.textContent = 'Nuevo evento';
        dateInput.value = selectedDateKey;
        recurrenceInput.value = 'none';
        updateEndDateField();
        setFormError('');
        eventForm.hidden = false;
        titleInput.focus();
    }

    function openEditEventForm(event) {
        editingEventId = event.id;
        eventForm.reset();
        eventFormTitle.textContent = 'Editar evento';
        titleInput.value = event.title;
        dateInput.value = event.startDate;
        timeInput.value = event.time || '';
        recurrenceInput.value = event.recurrence;
        endDateInput.value = event.endDate || '';
        updateEndDateField();
        setFormError('');
        eventForm.hidden = false;
        titleInput.focus();
    }

    function closeEventForm(restoreFocus = true) {
        eventForm.hidden = true;
        setFormError('');
        editingEventId = null;
        if (restoreFocus) addEventButton.focus();
    }

    function makeId() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
        return `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        const title = titleInput.value.trim();
        const startDate = dateInput.value;
        const recurrence = recurrenceInput.value;
        const endDate = recurrence === 'none' ? '' : endDateInput.value;

        if (!title) {
            setFormError('Escribe un título para el evento.');
            titleInput.focus();
            return;
        }
        if (!parseDateKey(startDate)) {
            setFormError('Elige una fecha válida para el evento.');
            dateInput.focus();
            return;
        }
        if (!RECURRENCES.has(recurrence)) {
            setFormError('Elige una opción de repetición válida.');
            recurrenceInput.focus();
            return;
        }
        if (endDate && (!parseDateKey(endDate) || endDate < startDate)) {
            setFormError('La fecha final debe ser igual o posterior a la fecha de inicio.');
            endDateInput.focus();
            return;
        }

        const eventIdToEdit = editingEventId;
        const nextEvent = {
            id: eventIdToEdit || makeId(),
            title,
            startDate,
            time: timeInput.value,
            recurrence,
            endDate,
        };
        const result = updateStoredEvents((latestEvents) => {
            if (!eventIdToEdit) return [...latestEvents, nextEvent];
            if (!latestEvents.some((storedEvent) => storedEvent.id === eventIdToEdit)) return null;
            return latestEvents.map((storedEvent) => storedEvent.id === eventIdToEdit ? nextEvent : storedEvent);
        });

        if (result === 'storage-error') {
            setFormError('No se pudo guardar en este navegador. Revisa el espacio disponible y vuelve a intentarlo.');
            render();
            return;
        }
        if (result === 'missing') {
            setFormError('Este evento se eliminó en otra pestaña. No se guardaron los cambios.');
            render();
            return;
        }

        calendarStatus.textContent = eventIdToEdit ? 'Evento actualizado en este navegador.' : 'Evento guardado en este navegador.';
        closeEventForm();
        render();
    }

    function navigateMonth(amount) {
        const oldDay = parseDateKey(selectedDateKey).getDate();
        currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + amount, 1, 12);
        const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 12).getDate();
        selectedDateKey = toDateKey(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), Math.min(oldDay, lastDay), 12));
        calendarStatus.textContent = '';
        render();
    }

    function focusCalendarDate(dateKey) {
        const button = calendarGrid.querySelector('button[data-date="' + dateKey + '"]');
        if (button) button.focus();
    }

    document.getElementById('previousMonth').addEventListener('click', () => navigateMonth(-1));
    document.getElementById('nextMonth').addEventListener('click', () => navigateMonth(1));
    document.getElementById('todayButton').addEventListener('click', () => {
        refreshTodayKey();
        selectedDateKey = todayKey;
        currentMonth = parseDateKey(todayKey);
        calendarStatus.textContent = '';
        render();
    });
    calendarGrid.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-date]');
        if (!button) return;
        selectedDateKey = button.dataset.date;
        const selectedDate = parseDateKey(selectedDateKey);
        if (selectedDate.getFullYear() !== currentMonth.getFullYear() || selectedDate.getMonth() !== currentMonth.getMonth()) {
            currentMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 12);
        }
        calendarStatus.textContent = '';
        render();
        focusCalendarDate(selectedDateKey);
    });
    addEventButton.addEventListener('click', openNewEventForm);
    document.getElementById('cancelEventButton').addEventListener('click', () => closeEventForm());
    document.getElementById('cancelEventButtonBottom').addEventListener('click', () => closeEventForm());
    recurrenceInput.addEventListener('change', updateEndDateField);
    dateInput.addEventListener('change', updateEndDateField);
    eventForm.addEventListener('submit', handleFormSubmit);

    eventList.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action][data-event-id]');
        if (!button) return;
        const storedEvent = events.find((item) => item.id === button.dataset.eventId);
        if (!storedEvent) return;

        if (button.dataset.action === 'edit') {
            openEditEventForm(storedEvent);
            return;
        }
        if (button.dataset.action === 'delete' && window.confirm(`¿Eliminar “${storedEvent.title}” y todas sus repeticiones?`)) {
            const eventIdToDelete = storedEvent.id;
            const deletingOpenForm = editingEventId === eventIdToDelete;
            const result = updateStoredEvents((latestEvents) =>
                latestEvents.some((item) => item.id === eventIdToDelete)
                    ? latestEvents.filter((item) => item.id !== eventIdToDelete)
                    : null);
            if (result === 'storage-error') {
                calendarStatus.textContent = 'No se pudo eliminar el evento del almacenamiento del navegador.';
                render();
                addEventButton.focus();
                return;
            }
            if (result === 'missing') {
                calendarStatus.textContent = 'Este evento ya no existe en el almacenamiento del navegador.';
                render();
                addEventButton.focus();
                return;
            }

            if (deletingOpenForm) closeEventForm(false);
            calendarStatus.textContent = 'Evento y sus repeticiones eliminados.';
            render();
            addEventButton.focus();
        }
    });

    window.addEventListener('storage', (storageEvent) => {
        if (storageEvent.key !== null && storageEvent.key !== EVENTS_STORAGE_KEY) return;

        const activeDateKey = document.activeElement?.dataset?.date;
        const eventListHadFocus = eventList.contains(document.activeElement);
        events = loadEvents();
        const editedEventWasRemoved = editingEventId && !events.some((item) => item.id === editingEventId);
        if (editedEventWasRemoved) closeEventForm(false);
        render();

        if (activeDateKey) focusCalendarDate(activeDateKey);
        else if (eventListHadFocus || editedEventWasRemoved) addEventButton.focus();
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && refreshTodayKey()) render();
    });
    scheduleTodayRefresh();
    render();
})();

(() => {
    const STORAGE_KEY = 'myroutine-data';

    const DEFAULT_DATA = {
        lunes: [
            { text: 'Preparar la mochila', done: true },
            { text: 'Hacer las tareas de la escuela', done: false },
            { text: 'Estudiar durante 30 minutos', done: false },
            { text: 'Preparar la ropa para mañana', done: false },
        ],
        martes: [
            { text: 'Repasar los apuntes de clase', done: false },
            { text: 'Hacer las tareas de la escuela', done: false },
            { text: 'Hacer ejercicio 20 minutos', done: false },
            { text: 'Ordenar la mochila', done: false },
        ],
        miercoles: [
            { text: 'Leer 20 minutos', done: false },
            { text: 'Hacer las tareas de la escuela', done: false },
            { text: 'Estudiar para el próximo examen', done: false },
            { text: 'Preparar la ropa para mañana', done: false },
        ],
        jueves: [
            { text: 'Preparar la mochila', done: false },
            { text: 'Hacer las tareas de la escuela', done: false },
            { text: 'Repasar lo visto en la semana', done: false },
            { text: 'Ordenar el cuarto', done: false },
        ],
        viernes: [
            { text: 'Hacer las tareas de la escuela', done: false },
            { text: 'Entregar trabajos pendientes', done: false },
            { text: 'Planificar el fin de semana', done: false },
            { text: 'Guardar los útiles de la semana', done: false },
        ],
        sabado: [
            { text: 'Descansar y despejar la mente', done: false },
            { text: 'Hacer alguna actividad recreativa', done: false },
            { text: 'Ayudar en casa', done: false },
            { text: 'Adelantar tareas de la próxima semana', done: false },
        ],
        domingo: [
            { text: 'Preparar la mochila para el lunes', done: false },
            { text: 'Revisar el horario de la semana', done: false },
            { text: 'Dejar la ropa lista', done: false },
            { text: 'Descansar temprano', done: false },
        ],
    };

    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) return JSON.parse(raw);
        } catch (err) {
            console.warn('No se pudo leer localStorage, se usarán datos por defecto.', err);
        }
        const initial = JSON.parse(JSON.stringify(DEFAULT_DATA));
        saveData(initial);
        return initial;
    }

    function saveData(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (err) {
            console.warn('No se pudo guardar en localStorage.', err);
        }
    }

    function getStats(tasks) {
        const total = tasks.length;
        const completed = tasks.filter((t) => t.done).length;
        const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
        return { total, completed, percent };
    }

    function updateRailDays(data, currentDay = '') {
        document.querySelectorAll('.rail-day[data-rail-day]').forEach((link) => {
            const day = link.dataset.railDay;
            const { percent } = getStats(data[day] || []);
            const fill = link.querySelector('.rail-day-fill');
            const label = link.querySelector('.rail-day-percent');
            const dayName = link.querySelector('.rail-day-name')?.textContent.trim() || day;

            if (fill) fill.style.width = `${percent}%`;
            if (label) label.textContent = `${percent}%`;
            link.classList.toggle('current-day', day === currentDay);
            link.setAttribute('aria-label', `${dayName}, ${percent}% completado`);
        });
    }

    function initIndexPage() {
        const cards = document.querySelectorAll('.day-card[data-day]');
        if (!cards.length) return;

        const data = loadData();
        const weekTasks = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
            .flatMap((day) => data[day] || []);
        const { total, completed, percent } = getStats(weekTasks);

        const weekTotalEl = document.getElementById('week-total');
        const weekCompletedEl = document.getElementById('week-completed');
        const weekPercentEl = document.getElementById('week-percent');
        const weekBarEl = document.getElementById('week-progress-bar');

        if (weekTotalEl) weekTotalEl.textContent = String(total);
        if (weekCompletedEl) weekCompletedEl.textContent = String(completed);
        if (weekPercentEl) weekPercentEl.textContent = `${percent}%`;
        if (weekBarEl) weekBarEl.style.width = `${percent}%`;

        cards.forEach((card) => {
            const day = card.dataset.day;
            const tasks = data[day] || [];
            const { total, percent } = getStats(tasks);

            const countEl = card.querySelector('.task-count');
            const barEl = card.querySelector('.progress-bar');
            const textEl = card.querySelector('.progress-text');

            if (countEl) {
                countEl.textContent = total === 1 ? '1 tarea planificada' : `${total} tareas planificadas`;
            }
            if (barEl) barEl.style.width = `${percent}%`;
            if (textEl) textEl.textContent = `${percent}% completado`;
        });

        updateRailDays(data);
    }

    function initDayPage() {
        const day = document.body.dataset.day;
        if (!day) return;

        const tasksList = document.getElementById('tasksList');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const tasksSection = document.querySelector('.tasks');

        const totalEl = document.getElementById('summary-total');
        const completedEl = document.getElementById('summary-completed');
        const percentEl = document.getElementById('summary-percent');
        const ringEl = document.querySelector('.summary-ring');
        const dayProgressEl = document.getElementById('day-progress-bar');
        const dayProgressCopyEl = document.getElementById('day-progress-copy');
        const dayHeroBarEl = document.getElementById('day-progress-hero');

        const data = loadData();
        if (!data[day]) data[day] = [];
        updateRailDays(data, day);

        let editingIndex = null;

        function render() {
            const tasks = data[day];
            const { total, completed, percent } = getStats(tasks);

            if (totalEl) totalEl.textContent = String(total);
            if (completedEl) completedEl.textContent = String(completed);
            if (percentEl) percentEl.textContent = `${percent}%`;
            if (dayProgressCopyEl) dayProgressCopyEl.textContent = `${percent}%`;
            if (dayHeroBarEl) dayHeroBarEl.style.width = `${percent}%`;
            if (ringEl) {
                ringEl.style.setProperty('--progress', `${percent}%`);
                ringEl.setAttribute('aria-label', `${percent}% completado`);
            }
            if (dayProgressEl) dayProgressEl.style.width = `${percent}%`;
            updateRailDays(data, day);

            tasksList.innerHTML = '';

            if (tasks.length === 0) {
                const empty = document.createElement('p');
                empty.className = 'empty-tasks';
                empty.textContent = 'No tienes tareas para hoy. ¡Agrega una!';
                tasksList.appendChild(empty);
                return;
            }

            tasks.forEach((task, index) => {
                const row = document.createElement('div');
                row.className = 'task' + (task.done ? ' completed' : '');

                const checkLabel = document.createElement('label');
                checkLabel.className = 'task-check';

                const input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = task.done;
                input.dataset.index = String(index);
                input.setAttribute('aria-label', `${task.done ? 'Marcar como pendiente' : 'Completar'}: ${task.text}`);

                const checkmark = document.createElement('span');
                checkmark.className = 'checkmark';

                checkLabel.append(input, checkmark);
                row.appendChild(checkLabel);

                if (index === editingIndex) {
                    const editInput = document.createElement('input');
                    editInput.type = 'text';
                    editInput.className = 'task-edit-input';
                    editInput.value = task.text;
                    editInput.setAttribute('aria-label', `Editar tarea: ${task.text}`);

                    let settled = false;

                    function commitEdit() {
                        if (settled) return;
                        settled = true;
                        const value = editInput.value.trim();
                        if (value) {
                            data[day][index].text = value;
                            saveData(data);
                        }
                        editingIndex = null;
                        render();
                    }

                    function cancelEdit() {
                        if (settled) return;
                        settled = true;
                        editingIndex = null;
                        render();
                    }

                    editInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') cancelEdit();
                    });
                    editInput.addEventListener('blur', commitEdit);

                    row.appendChild(editInput);
                    requestAnimationFrame(() => {
                        editInput.focus();
                        editInput.select();
                    });
                } else {
                    const text = document.createElement('span');
                    text.className = 'task-text';
                    text.textContent = task.text;
                    row.appendChild(text);

                    const actions = document.createElement('div');
                    actions.className = 'task-actions';

                    const editBtn = document.createElement('button');
                    editBtn.type = 'button';
                    editBtn.className = 'task-edit';
                    editBtn.dataset.index = String(index);
                    editBtn.setAttribute('aria-label', 'Editar tarea');
                    editBtn.textContent = '✎';

                    const del = document.createElement('button');
                    del.type = 'button';
                    del.className = 'task-delete';
                    del.dataset.index = String(index);
                    del.setAttribute('aria-label', 'Eliminar tarea');
                    del.textContent = '✕';

                    actions.append(editBtn, del);
                    row.appendChild(actions);
                }

                tasksList.appendChild(row);
            });
        }

        // Si hay un input de edición con el foco, lo cierra ya mismo (guarda y
        // re-renderiza) en lugar de dejar que su "blur" se dispare a mitad de
        // OTRO render() más adelante, lo que reentraría y pisaría ese cambio.
        function closeActiveEdit() {
            const input = tasksList.querySelector('.task-edit-input');
            if (input) input.blur();
        }

        // Evita que un mousedown sobre otra fila le quite el foco al input de
        // edición abierto: eso dispararía su "blur" a mitad del clic y el
        // re-render destruiría el botón justo antes de que llegue el evento
        // "click", perdiéndolo. En su lugar, closeActiveEdit() lo maneja.
        tasksList.addEventListener('mousedown', (e) => {
            if (editingIndex === null) return;
            if (e.target.closest('.task-edit-input')) return;
            e.preventDefault();
        });

        tasksList.addEventListener('change', (e) => {
            if (e.target.matches('input[type="checkbox"]')) {
                closeActiveEdit();
                const index = Number(e.target.dataset.index);
                data[day][index].done = e.target.checked;
                saveData(data);
                render();
            }
        });

        tasksList.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.task-edit');
            if (editBtn) {
                closeActiveEdit();
                editingIndex = Number(editBtn.dataset.index);
                render();
                return;
            }

            const delBtn = e.target.closest('.task-delete');
            if (delBtn) {
                closeActiveEdit();
                const index = Number(delBtn.dataset.index);
                data[day].splice(index, 1);
                saveData(data);
                render();
            }
        });

        function showAddForm() {
            if (tasksSection.querySelector('.add-task-form')) return;

            const form = document.createElement('div');
            form.className = 'add-task-form';

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'add-task-input';
            input.placeholder = 'Escribe una nueva tarea...';
            input.setAttribute('aria-label', 'Nueva tarea');

            const confirmBtn = document.createElement('button');
            confirmBtn.type = 'button';
            confirmBtn.className = 'add-task-confirm';
            confirmBtn.textContent = 'Agregar';

            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'add-task-cancel';
            cancelBtn.textContent = 'Cancelar';

            function confirmAdd() {
                const value = input.value.trim();
                if (value) {
                    data[day].push({ text: value, done: false });
                    saveData(data);
                    render();
                }
                form.remove();
            }

            confirmBtn.addEventListener('click', confirmAdd);
            cancelBtn.addEventListener('click', () => form.remove());
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') confirmAdd();
                if (e.key === 'Escape') form.remove();
            });

            form.append(input, confirmBtn, cancelBtn);
            tasksSection.insertBefore(form, tasksList);
            input.focus();
        }

        if (addTaskBtn) addTaskBtn.addEventListener('click', showAddForm);

        render();
    }

    const THEME_STORAGE_KEY = 'myroutine-theme';
const SIDEBAR_STORAGE_KEY = 'myroutine-sidebar';

const THEMES = {
    rosa:    { primary: '#df91aa', dark: '#783c50', darker: '#c66d8b', light: '#f8e2e9', soft: '#fff6f9', rgb: '223, 145, 170', hero: ['#f6c0cf', '#f5b6c8', '#f3abc0'], heroInk: '#5b3644' },
    morado:  { primary: '#9478c5', dark: '#4d3d68', darker: '#7656aa', light: '#eee8f6', soft: '#faf8fd', rgb: '148, 120, 197', hero: ['#e7def4', '#ddd2f0', '#d2c4eb'], heroInk: '#3b3150' },
    azul:    { primary: '#7299bd', dark: '#35516c', darker: '#547fa7', light: '#e5eef5', soft: '#f6fafe', rgb: '114, 153, 189', hero: ['#dce8f3', '#cedfee', '#c0d6eb'], heroInk: '#2e4256' },
    verde:   { primary: '#81a88d', dark: '#3f5f49', darker: '#62866d', light: '#e7f0e9', soft: '#f7fbf7', rgb: '129, 168, 141', hero: ['#dfebe1', '#d3e4d7', '#c5ddcb'], heroInk: '#34483a' },
    naranja: { primary: '#d99562', dark: '#714a2e', darker: '#bd7442', light: '#f7e9dc', soft: '#fffaf5', rgb: '217, 149, 98', hero: ['#fae6d3', '#f5d8bd', '#f0c8a6'], heroInk: '#59402a' },
};

function applyTheme(name) {
    const theme = THEMES[name] || THEMES.rosa;
    const root = document.documentElement.style;

    root.setProperty('--color-primary', theme.primary);
    root.setProperty('--color-primary-dark', theme.dark);
    root.setProperty('--color-primary-darker', theme.darker);
    root.setProperty('--color-primary-light', theme.light);
    root.setProperty('--color-primary-soft', theme.soft);
    root.setProperty('--color-primary-rgb', theme.rgb);
    root.setProperty('--color-hero-start', theme.hero[0]);
    root.setProperty('--color-hero-middle', theme.hero[1]);
    root.setProperty('--color-hero-end', theme.hero[2]);
    root.setProperty('--color-hero-ink', theme.heroInk);

    document.querySelectorAll('.theme-circle').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.theme === name);
    });
}

function initTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'rosa';
    applyTheme(saved);

    document.querySelectorAll('.theme-circle').forEach((btn) => {
        btn.addEventListener('click', () => {
            const name = btn.dataset.theme;
            localStorage.setItem(THEME_STORAGE_KEY, name);
            applyTheme(name);
        });
    });
}

function initSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const openBtn = document.getElementById('sidebarOpenBtn');
    const sidebar = document.getElementById('sidebar');
    const savedState = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const startsClosed = savedState === 'closed'
        || (savedState !== 'open' && window.matchMedia('(max-width: 700px)').matches);

    function setClosed(closed, persist = true) {
        document.body.classList.toggle('sidebar-closed', closed);
        if (sidebar) {
            sidebar.setAttribute('aria-hidden', String(closed));
            sidebar.inert = closed;
        }
        if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!closed));
        if (openBtn) openBtn.setAttribute('aria-expanded', String(!closed));
        if (persist) localStorage.setItem(SIDEBAR_STORAGE_KEY, closed ? 'closed' : 'open');
    }

    setClosed(startsClosed, false);

    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            setClosed(true);
            if (openBtn) openBtn.focus();
        });
    }

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            setClosed(false);
            if (toggleBtn) toggleBtn.focus();
        });
    }
}

    document.addEventListener('DOMContentLoaded', () => {
    initIndexPage();
    initDayPage();
    initTheme();
    initSidebarToggle();
});

})();

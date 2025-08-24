// settings-schedule-manager.js - Управління модальним вікном налаштувань розкладу

export class SettingsScheduleManager {
    constructor() {
        this.modal = null;
        this.isInitialized = false;
        this.currentSettings = null;
        
        // API базова URL
        this.apiBaseUrl = 'https://sheduleapi.kntu.pp.ua/api';
        
        // Кеш для API запитів
        this.cache = {
            faculties: null,
            groups: new Map(),
            cafedras: new Map(),
            instructors: new Map()
        };
        
        // DOM елементи
        this.elements = {};
    }

    // Ініціалізація менеджера
    async init() {
        if (this.isInitialized) return;
        
        try {
            await this.loadModalHTML();
            this.cacheElements();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('SettingsScheduleManager ініціалізовано');
        } catch (error) {
            console.error('Помилка ініціалізації SettingsScheduleManager:', error);
            throw error;
        }
    }

    // Завантаження HTML модалки в DOM
    async loadModalHTML() {
        try {
            const response = await fetch('/pwa/settings-schedule.html');
            if (!response.ok) {
                throw new Error(`Помилка завантаження модалки: ${response.status}`);
            }
            
            const modalHTML = await response.text();
            
            // Додаємо модалку в body якщо її ще немає
            if (!document.getElementById('schedule-settings-modal')) {
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }
            
            this.modal = document.getElementById('schedule-settings-modal');
            
        } catch (error) {
            console.error('Не вдалося завантажити модалку:', error);
            // Fallback - створюємо базову модалку через JS
            this.createFallbackModal();
        }
    }

    // Fallback модалка якщо не вдається завантажити HTML
    createFallbackModal() {
        const modalHTML = `
            <div id="schedule-settings-modal" class="fixed inset-0 bg-black bg-opacity-50 z-50 hidden">
                <div class="min-h-screen flex items-center justify-center p-4">
                    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div class="bg-indigo-600 text-white p-4 rounded-t-lg">
                            <div class="flex justify-between items-center">
                                <h3 class="text-lg font-semibold">Налаштування розкладу</h3>
                                <button id="close-schedule-modal" class="text-white hover:text-gray-200">×</button>
                            </div>
                        </div>
                        <div class="p-6">
                            <p class="text-center text-gray-600">Помилка завантаження форми налаштувань</p>
                            <button id="cancel-schedule-settings" class="mt-4 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md">
                                Закрити
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.modal = document.getElementById('schedule-settings-modal');
    }

    // Кешування DOM елементів
    cacheElements() {
        this.elements = {
            modal: document.getElementById('schedule-settings-modal'),
            closeBtn: document.getElementById('close-schedule-modal'),
            cancelBtn: document.getElementById('cancel-schedule-settings'),
            saveBtn: document.getElementById('save-schedule-settings'),
            form: document.getElementById('schedule-settings-form'),
            loading: document.getElementById('schedule-loading'),
            errorMessage: document.getElementById('schedule-error-message'),
            errorText: document.getElementById('schedule-error-text'),
            
            // Селекти
            userRole: document.getElementById('user-role'),
            studentFlow: document.getElementById('student-flow'),
            teacherFlow: document.getElementById('teacher-flow'),
            
            // Студентський потік
            studentFaculty: document.getElementById('student-faculty'),
            groupContainer: document.getElementById('group-container'),
            studentGroup: document.getElementById('student-group'),
            
            // Викладацький потік
            teacherFaculty: document.getElementById('teacher-faculty'),
            cafedraContainer: document.getElementById('cafedra-container'),
            teacherCafedra: document.getElementById('teacher-cafedra'),
            teacherContainer: document.getElementById('teacher-container'),
            teacherSelect: document.getElementById('teacher-select')
        };
    }

    // Налаштування обробників подій
    setupEventListeners() {
        // Закриття модалки
        this.elements.closeBtn?.addEventListener('click', () => this.hide());
        this.elements.cancelBtn?.addEventListener('click', () => this.hide());
        
        // Клік по backdrop
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.hide();
            }
        });
        
        // ESC для закриття
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isVisible()) {
                this.hide();
            }
        });

        // Зміна ролі
        this.elements.userRole?.addEventListener('change', (e) => {
            this.handleRoleChange(e.target.value);
        });

        // Студентський потік
        this.elements.studentFaculty?.addEventListener('change', (e) => {
            this.handleStudentFacultyChange(e.target.value);
        });

        this.elements.studentGroup?.addEventListener('change', () => {
            this.validateForm();
        });

        // Викладацький потік
        this.elements.teacherFaculty?.addEventListener('change', (e) => {
            this.handleTeacherFacultyChange(e.target.value);
        });

        this.elements.teacherCafedra?.addEventListener('change', (e) => {
            this.handleCafedraChange(e.target.value);
        });

        this.elements.teacherSelect?.addEventListener('change', () => {
            this.validateForm();
        });

        // Форма
        this.elements.form?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
    }

    // Показати модалку
    async show() {
        try {
            if (!this.isInitialized) {
                await this.init();
            }

            // Завантажуємо факультети при відкритті
            await this.loadFaculties();

            this.elements.modal?.classList.remove('hidden');
            setTimeout(() => {
                this.elements.modal?.classList.add('show');
            }, 10);

            // Блокуємо скролл body
            document.body.style.overflow = 'hidden';

        } catch (error) {
            console.error('Помилка показу модалки:', error);
            this.showError('Помилка завантаження налаштувань: ' + error.message);
        }
    }

    // Приховати модалку
    hide() {
        this.elements.modal?.classList.remove('show');
        setTimeout(() => {
            this.elements.modal?.classList.add('hidden');
            this.resetForm();
        }, 300);

        // Відновлюємо скролл body
        document.body.style.overflow = '';
    }

    // Перевірка чи модалка видима
    isVisible() {
        return this.elements.modal && !this.elements.modal.classList.contains('hidden');
    }

    // Показати індикатор завантаження
    showLoading(show = true) {
        if (this.elements.loading) {
            this.elements.loading.classList.toggle('hidden', !show);
        }
    }

    // Показати помилку
    showError(message) {
        if (this.elements.errorMessage && this.elements.errorText) {
            this.elements.errorText.textContent = message;
            this.elements.errorMessage.classList.remove('hidden');
            
            // Автоматично приховати через 5 секунд
            setTimeout(() => {
                this.elements.errorMessage.classList.add('hidden');
            }, 5000);
        }
    }

    // Приховати помилку
    hideError() {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.classList.add('hidden');
        }
    }

    // === API МЕТОДИ ===

    // Завантаження факультетів
    async loadFaculties() {
        try {
            // Перевіряємо кеш
            if (this.cache.faculties) {
                this.populateFaculties(this.cache.faculties);
                return;
            }

            this.showLoading(true);
            this.hideError();

            const response = await fetch(`${this.apiBaseUrl}/faculties/get-all`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const faculties = await response.json();
            this.cache.faculties = faculties;
            this.populateFaculties(faculties);

        } catch (error) {
            console.error('Помилка завантаження факультетів:', error);
            this.showError('Не вдалося завантажити список факультетів');
        } finally {
            this.showLoading(false);
        }
    }

    // Заповнення селектів факультетів
    populateFaculties(faculties) {
        const selects = [this.elements.studentFaculty, this.elements.teacherFaculty];
        
        selects.forEach(select => {
            if (select) {
                select.innerHTML = '<option value="">-- Оберіть факультет --</option>';
                faculties.forEach(faculty => {
                    const option = document.createElement('option');
                    option.value = faculty.idFaculty;
                    option.textContent = faculty.name;
                    select.appendChild(option);
                });
            }
        });
    }

    // Завантаження груп за факультетом
    async loadGroups(facultyId) {
        try {
            // Перевіряємо кеш
            if (this.cache.groups.has(facultyId)) {
                this.populateGroups(this.cache.groups.get(facultyId));
                return;
            }

            this.showLoading(true);

            const response = await fetch(`${this.apiBaseUrl}/groups/get-all-by-id-faculty?idFaculty=${facultyId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const groups = await response.json();
            this.cache.groups.set(facultyId, groups);
            this.populateGroups(groups);

        } catch (error) {
            console.error('Помилка завантаження груп:', error);
            this.showError('Не вдалося завантажити список груп');
        } finally {
            this.showLoading(false);
        }
    }

    // Заповнення селекта груп
    populateGroups(groups) {
        if (this.elements.studentGroup) {
            this.elements.studentGroup.innerHTML = '<option value="">-- Оберіть групу --</option>';
            groups.forEach(group => {
                const option = document.createElement('option');
                option.value = group.id;
                option.textContent = group.name;
                this.elements.studentGroup.appendChild(option);
            });
        }
    }

    // Завантаження кафедр за факультетом
    async loadCafedras(facultyId) {
        try {
            if (this.cache.cafedras.has(facultyId)) {
                this.populateCafedras(this.cache.cafedras.get(facultyId));
                return;
            }

            this.showLoading(true);

            const response = await fetch(`${this.apiBaseUrl}/cafedras/get-all-by-id-faculty?idFaculty=${facultyId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const cafedras = await response.json();
            this.cache.cafedras.set(facultyId, cafedras);
            this.populateCafedras(cafedras);

        } catch (error) {
            console.error('Помилка завантаження кафедр:', error);
            this.showError('Не вдалося завантажити список кафедр');
        } finally {
            this.showLoading(false);
        }
    }

    // Заповнення селекта кафедр
    populateCafedras(cafedras) {
        if (this.elements.teacherCafedra) {
            this.elements.teacherCafedra.innerHTML = '<option value="">-- Оберіть кафедру --</option>';
            cafedras.forEach(cafedra => {
                const option = document.createElement('option');
                option.value = cafedra.idCafedra;
                option.textContent = cafedra.name;
                this.elements.teacherCafedra.appendChild(option);
            });
        }
    }

    // Завантаження викладачів за кафедрою
    async loadInstructors(cafedraId) {
        try {
            if (this.cache.instructors.has(cafedraId)) {
                this.populateInstructors(this.cache.instructors.get(cafedraId));
                return;
            }

            this.showLoading(true);

            const response = await fetch(`${this.apiBaseUrl}/instructors/get-all-by-cafedra?idCafedra=${cafedraId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const instructors = await response.json();
            this.cache.instructors.set(cafedraId, instructors);
            this.populateInstructors(instructors);

        } catch (error) {
            console.error('Помилка завантаження викладачів:', error);
            this.showError('Не вдалося завантажити список викладачів');
        } finally {
            this.showLoading(false);
        }
    }

    // Заповнення селекта викладачів
    populateInstructors(instructors) {
        if (this.elements.teacherSelect) {
            this.elements.teacherSelect.innerHTML = '<option value="">-- Оберіть викладача --</option>';
            instructors.forEach(instructor => {
                const option = document.createElement('option');
                option.value = instructor.id;
                option.textContent = instructor.name;
                this.elements.teacherSelect.appendChild(option);
            });
        }
    }

    // === ОБРОБНИКИ ПОДІЙ ===

    // Зміна ролі
    async handleRoleChange(role) {
        // Приховуємо всі потоки
        this.elements.studentFlow?.classList.add('hidden');
        this.elements.teacherFlow?.classList.add('hidden');
        
        // Приховуємо підселекти
        this.elements.groupContainer?.classList.add('hidden');
        this.elements.cafedraContainer?.classList.add('hidden');
        this.elements.teacherContainer?.classList.add('hidden');

        if (role === 'student') {
            this.elements.studentFlow?.classList.remove('hidden');
        } else if (role === 'teacher') {
            this.elements.teacherFlow?.classList.remove('hidden');
        }

        this.validateForm();
    }

    // Зміна факультету для студентів
    async handleStudentFacultyChange(facultyId) {
        if (facultyId) {
            this.elements.groupContainer?.classList.remove('hidden');
            await this.loadGroups(facultyId);
        } else {
            this.elements.groupContainer?.classList.add('hidden');
        }
        this.validateForm();
    }

    // Зміна факультету для викладачів
    async handleTeacherFacultyChange(facultyId) {
        this.elements.cafedraContainer?.classList.add('hidden');
        this.elements.teacherContainer?.classList.add('hidden');
        
        if (facultyId) {
            this.elements.cafedraContainer?.classList.remove('hidden');
            await this.loadCafedras(facultyId);
        }
        this.validateForm();
    }

    // Зміна кафедри
    async handleCafedraChange(cafedraId) {
        this.elements.teacherContainer?.classList.add('hidden');
        
        if (cafedraId) {
            this.elements.teacherContainer?.classList.remove('hidden');
            await this.loadInstructors(cafedraId);
        }
        this.validateForm();
    }

    // Валідація форми
    validateForm() {
        const role = this.elements.userRole?.value;
        let isValid = false;

        if (role === 'student') {
            const faculty = this.elements.studentFaculty?.value;
            const group = this.elements.studentGroup?.value;
            isValid = faculty && group;
        } else if (role === 'teacher') {
            const faculty = this.elements.teacherFaculty?.value;
            const cafedra = this.elements.teacherCafedra?.value;
            const teacher = this.elements.teacherSelect?.value;
            isValid = faculty && cafedra && teacher;
        }

        if (this.elements.saveBtn) {
            this.elements.saveBtn.disabled = !isValid;
        }
    }

    // Збереження налаштувань
    saveSettings() {
        const role = this.elements.userRole?.value;
        let settings = { userRole: role };

        if (role === 'student') {
            const facultySelect = this.elements.studentFaculty;
            const groupSelect = this.elements.studentGroup;
            
            settings.selectedId = groupSelect?.value;
            settings.displayName = groupSelect?.options[groupSelect.selectedIndex]?.textContent;
            settings.facultyId = facultySelect?.value;
            settings.facultyName = facultySelect?.options[facultySelect.selectedIndex]?.textContent;
            
        } else if (role === 'teacher') {
            const teacherSelect = this.elements.teacherSelect;
            const facultySelect = this.elements.teacherFaculty;
            const cafedraSelect = this.elements.teacherCafedra;
            
            settings.selectedId = teacherSelect?.value;
            settings.displayName = teacherSelect?.options[teacherSelect.selectedIndex]?.textContent;
            settings.facultyId = facultySelect?.value;
            settings.facultyName = facultySelect?.options[facultySelect.selectedIndex]?.textContent;
            settings.cafedraId = cafedraSelect?.value;
            settings.cafedraName = cafedraSelect?.options[cafedraSelect.selectedIndex]?.textContent;
        }

        // Зберігаємо в localStorage
        localStorage.setItem('scheduleSettings', JSON.stringify(settings));
        
        console.log('Налаштування збережено:', settings);
        
        // Закриваємо модалку
        this.hide();
        
        // Викликаємо callback якщо є
        if (this.onSettingsSaved) {
            this.onSettingsSaved(settings);
        }
    }

    // Скидання форми
    resetForm() {
        if (this.elements.form) {
            this.elements.form.reset();
        }
        
        // Приховуємо всі потоки
        this.elements.studentFlow?.classList.add('hidden');
        this.elements.teacherFlow?.classList.add('hidden');
        this.elements.groupContainer?.classList.add('hidden');
        this.elements.cafedraContainer?.classList.add('hidden');
        this.elements.teacherContainer?.classList.add('hidden');
        
        this.hideError();
        this.validateForm();
    }

    // Встановлення callback для збереження
    onSave(callback) {
        this.onSettingsSaved = callback;
    }
}

// schedule-renderer.js - Рендеринг розкладу занять в UI

import { config } from './config-loader.js';
import { scheduleAPI } from './schedule-api.js';

export class ScheduleRenderer {
    constructor(containerSelector = '#schedule-content') {
        this.container = null;
        this.containerSelector = containerSelector;
        this.currentView = 'day'; // day | week
        this.currentDate = new Date();
        this.currentSettings = null;
        this.currentData = null;
        this.isInitialized = false;
        
        // UI елементи
        this.elements = {};
        
        // Конфігурація
        this.uiConfig = null;
        this.periods = null;
        this.messages = null;
        
        // Responsive breakpoint
        this.mobileBreakpoint = 768;
    }

    // Ініціалізація рендерера
    async init() {
        if (this.isInitialized) return;
        
        try {
            // Завантажуємо конфігурації
            this.uiConfig = await config.getUIConfig();
            this.periods = await config.getClassSchedulePeriods();
            this.messages = await config.getMessages();
            this.mobileBreakpoint = this.uiConfig.responsive?.mobileBreakpoint || 768;
            
            // Знаходимо контейнер
            this.container = document.querySelector(this.containerSelector);
            if (!this.container) {
                throw new Error(`Контейнер ${this.containerSelector} не знайдено`);
            }

            // Створюємо базову структуру UI
            this.createBaseUI();
            this.setupEventListeners();
            this.setupResponsiveHandler();
            
            this.isInitialized = true;
            console.log('ScheduleRenderer ініціалізовано');
            
        } catch (error) {
            console.error('Помилка ініціалізації ScheduleRenderer:', error);
            throw error;
        }
    }

    // Створення базової структури UI
    createBaseUI() {
        this.container.innerHTML = `
            <div class="schedule-renderer">
                <!-- Контроли вгорі -->
                <div class="schedule-controls mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <div class="flex flex-col sm:flex-row gap-4 items-center justify-between">
                        <!-- Перемикач вигляду -->
                        <div class="view-switcher flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button class="view-btn active" data-view="day">
                                <i class="fas fa-calendar-day mr-2"></i>День
                            </button>
                            <button class="view-btn" data-view="week">
                                <i class="fas fa-calendar-week mr-2"></i>Тиждень
                            </button>
                        </div>
                        
                        <!-- Контроли дати -->
                        <div class="date-controls flex items-center gap-2">
                            <button id="prev-period" class="btn-nav">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <input type="date" id="date-picker" class="date-input">
                            <button id="next-period" class="btn-nav">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                            <button id="today-btn" class="btn-today">
                                <i class="fas fa-calendar-day mr-1"></i>Сьогодні
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Головний контент -->
                <div id="schedule-main-content" class="schedule-main-content">
                    <!-- Тут буде рендеритися розклад -->
                </div>
            </div>
        `;

        // Кешуємо елементи
        this.cacheElements();
        this.applyStyles();
    }

    // Кешування DOM елементів
    cacheElements() {
        this.elements = {
            controls: this.container.querySelector('.schedule-controls'),
            viewButtons: this.container.querySelectorAll('.view-btn'),
            dateInput: this.container.querySelector('#date-picker'),
            prevBtn: this.container.querySelector('#prev-period'),
            nextBtn: this.container.querySelector('#next-period'),
            todayBtn: this.container.querySelector('#today-btn'),
            mainContent: this.container.querySelector('#schedule-main-content')
        };
    }

    // Застосування стилів
    applyStyles() {
        const styles = `
            <style>
                .schedule-renderer {
                    min-height: 400px;
                }
                
                .view-switcher .view-btn {
                    padding: 0.5rem 1rem;
                    background: transparent;
                    border: none;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                    color: #6b7280;
                }
                
                .view-switcher .view-btn.active {
                    background: white;
                    color: #4f46e5;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .view-switcher .view-btn:hover:not(.active) {
                    color: #374151;
                }
                
                .date-input {
                    padding: 0.5rem;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    font-size: 0.875rem;
                    min-width: 150px;
                }
                
                .date-input:focus {
                    outline: none;
                    border-color: #4f46e5;
                    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
                }
                
                .btn-nav, .btn-today {
                    padding: 0.5rem;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 0.375rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 0.875rem;
                }
                
                .btn-nav:hover, .btn-today:hover {
                    background: #f3f4f6;
                    border-color: #9ca3af;
                }
                
                .btn-today {
                    color: #4f46e5;
                    font-weight: 500;
                }
                
                .schedule-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: white;
                    border-radius: 0.5rem;
                    overflow: hidden;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .schedule-table th {
                    background: #f9fafb;
                    padding: 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: #374151;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .schedule-table td {
                    padding: 1rem;
                    border-bottom: 1px solid #f3f4f6;
                    vertical-align: top;
                }
                
                .lesson-card {
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    padding: 1rem;
                    margin-bottom: 1rem;
                }
                
                .lesson-type-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: white;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: #6b7280;
                }
                
                .loading-state {
                    text-align: center;
                    padding: 3rem 1rem;
                }
                
                .error-state {
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 0.5rem;
                    padding: 1rem;
                    color: #dc2626;
                    margin: 1rem 0;
                }
                
                @media (max-width: 768px) {
                    .schedule-controls .flex {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    
                    .date-controls {
                        justify-content: center;
                        flex-wrap: wrap;
                    }
                    
                    .schedule-table {
                        font-size: 0.875rem;
                    }
                    
                    .schedule-table th,
                    .schedule-table td {
                        padding: 0.5rem;
                    }
                }
                
                /* Темна тема */
                @media (prefers-color-scheme: dark) {
                    .schedule-table {
                        background: #374151;
                        color: #f3f4f6;
                    }
                    
                    .schedule-table th {
                        background: #4b5563;
                        color: #e5e7eb;
                        border-color: #6b7280;
                    }
                    
                    .schedule-table td {
                        border-color: #4b5563;
                    }
                    
                    .lesson-card {
                        background: #374151;
                        color: #f3f4f6;
                    }
                    
                    .date-input, .btn-nav, .btn-today {
                        background: #374151;
                        border-color: #4b5563;
                        color: #f3f4f6;
                    }
                    
                    .empty-state {
                        color: #9ca3af;
                    }
                }
            </style>
        `;

        // Додаємо стилі якщо їх ще немає
        if (!document.querySelector('#schedule-renderer-styles')) {
            const styleElement = document.createElement('div');
            styleElement.id = 'schedule-renderer-styles';
            styleElement.innerHTML = styles;
            document.head.appendChild(styleElement);
        }
    }

    // Налаштування обробників подій
    setupEventListeners() {
        // Перемикач вигляду
        this.elements.viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Контроли дати
        this.elements.dateInput.addEventListener('change', (e) => {
            this.setDate(new Date(e.target.value));
        });

        this.elements.prevBtn.addEventListener('click', () => {
            this.navigatePeriod(-1);
        });

        this.elements.nextBtn.addEventListener('click', () => {
            this.navigatePeriod(1);
        });

        this.elements.todayBtn.addEventListener('click', () => {
            this.setDate(new Date());
        });
    }

    // Обробник responsive змін
    setupResponsiveHandler() {
        const mediaQuery = window.matchMedia(`(max-width: ${this.mobileBreakpoint}px)`);
        
        const handleResponsiveChange = () => {
            if (this.currentData) {
                this.renderCurrentData();
            }
        };

        mediaQuery.addListener(handleResponsiveChange);
    }

    // === ОСНОВНІ МЕТОДИ РЕНДЕРИНГУ ===

    // Рендеринг розкладу з налаштуваннями
    async render(settings, date = null, view = null) {
        try {
            await this.ensureInitialized();
            
            this.currentSettings = settings;
            this.currentDate = date || new Date();
            
            if (view) {
                this.currentView = view;
            }

            this.updateControls();
            await this.loadAndRenderSchedule();
            
        } catch (error) {
            console.error('Помилка рендерингу розкладу:', error);
            this.renderErrorState(error);
        }
    }

    // Завантаження та рендеринг даних
    async loadAndRenderSchedule() {
        try {
            this.renderLoadingState();

            let scheduleData;
            
            if (this.currentView === 'day') {
                scheduleData = await scheduleAPI.getScheduleForDay(
                    this.currentSettings, 
                    config.formatDateForAPI(this.currentDate)
                );
            } else if (this.currentView === 'week') {
                scheduleData = await scheduleAPI.getScheduleForWeek(
                    this.currentSettings, 
                    config.formatDateForAPI(this.currentDate)
                );
            }

            this.currentData = scheduleData;
            this.renderCurrentData();

        } catch (error) {
            console.error('Помилка завантаження розкладу:', error);
            this.renderErrorState(error);
        }
    }

    // Рендеринг поточних даних
    renderCurrentData() {
        if (!this.currentData) {
            this.renderEmptyState();
            return;
        }

        if (this.currentView === 'day') {
            this.renderDayView(this.currentData);
        } else if (this.currentView === 'week') {
            this.renderWeekView(this.currentData);
        }
    }

    // === РЕНДЕРИНГ ДЕННОГО ВИГЛЯДУ ===

    renderDayView(data) {
        const isEmpty = !scheduleAPI.hasScheduleData(data);
        
        if (isEmpty) {
            this.renderEmptyState('На цей день розклад відсутній');
            return;
        }

        const isMobile = window.innerWidth <= this.mobileBreakpoint;
        
        if (isMobile) {
            this.renderDayViewMobile(data);
        } else {
            this.renderDayViewDesktop(data);
        }
    }

    // Денний вигляд на desktop
    renderDayViewDesktop(data) {
        const scheduleEntries = Object.entries(data.schedule);
        
        let tableHTML = `
            <div class="day-view-desktop">
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        ${data.displayTitle} | ${data.formattedDate}
                    </h3>
                </div>
                
                <table class="schedule-table">
                    <thead>
                        <tr>
                            <th style="width: 100px;">Пара</th>
                            <th style="width: 100px;">Час</th>
                            <th>Предмет</th>
                            <th>Тип</th>
                            <th>Викладач/Група</th>
                            <th>Аудиторія</th>
                            <th>Тижні</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        scheduleEntries.forEach(([lessonNumber, lesson]) => {
            const period = this.periods.find(p => p.number == lessonNumber);
            const timeStr = period ? `${period.start} - ${period.end}` : '';
            
            tableHTML += `
                <tr>
                    <td>
                        <div class="flex items-center">
                            <span class="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-semibold text-sm">
                                ${lessonNumber}
                            </span>
                        </div>
                    </td>
                    <td class="text-sm text-gray-600 dark:text-gray-400">
                        ${timeStr}
                    </td>
                    <td>
                        <div class="font-medium text-gray-900 dark:text-white">
                            ${lesson.title}
                        </div>
                    </td>
                    <td>
                        ${this.renderLessonTypeBadge(lesson)}
                    </td>
                    <td class="text-sm text-gray-600 dark:text-gray-400">
                        ${lesson.instructorName || lesson.group || '-'}
                    </td>
                    <td class="text-sm text-gray-600 dark:text-gray-400">
                        ${lesson.room || '-'}
                    </td>
                    <td class="text-sm text-gray-600 dark:text-gray-400">
                        ${lesson.weeks || '-'}
                        ${lesson.evenOrOdd ? `<br><span class="text-xs">(${lesson.evenOrOdd})</span>` : ''}
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        this.elements.mainContent.innerHTML = tableHTML;
    }

    // Денний вигляд на mobile
    renderDayViewMobile(data) {
        const scheduleEntries = Object.entries(data.schedule);
        
        let cardsHTML = `
            <div class="day-view-mobile">
                <div class="mb-4 text-center">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        ${data.displayTitle}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">${data.formattedDate}</p>
                </div>
                
                <div class="lessons-cards">
        `;

        scheduleEntries.forEach(([lessonNumber, lesson]) => {
            const period = this.periods.find(p => p.number == lessonNumber);
            const timeStr = period ? `${period.start} - ${period.end}` : '';
            
            cardsHTML += `
                <div class="lesson-card">
                    <div class="flex items-start justify-between mb-3">
                        <div class="flex items-center">
                            <span class="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-bold mr-3">
                                ${lessonNumber}
                            </span>
                            <div>
                                <div class="text-sm text-gray-600 dark:text-gray-400">${timeStr}</div>
                            </div>
                        </div>
                        ${this.renderLessonTypeBadge(lesson)}
                    </div>
                    
                    <h4 class="font-medium text-gray-900 dark:text-white mb-2">
                        ${lesson.title}
                    </h4>
                    
                    <div class="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                        ${lesson.instructorName ? `<div><i class="fas fa-user mr-2"></i>${lesson.instructorName}</div>` : ''}
                        ${lesson.group ? `<div><i class="fas fa-users mr-2"></i>${lesson.group}</div>` : ''}
                        ${lesson.room ? `<div><i class="fas fa-map-marker-alt mr-2"></i>${lesson.room}</div>` : ''}
                        ${lesson.weeks ? `<div><i class="fas fa-calendar mr-2"></i>${lesson.weeks}${lesson.evenOrOdd ? ` (${lesson.evenOrOdd})` : ''}</div>` : ''}
                    </div>
                </div>
            `;
        });

        cardsHTML += `
                </div>
            </div>
        `;

        this.elements.mainContent.innerHTML = cardsHTML;
    }

    // === РЕНДЕРИНГ ТИЖНЕВОГО ВИГЛЯДУ ===

    renderWeekView(weekData) {
        const isMobile = window.innerWidth <= this.mobileBreakpoint;
        
        if (isMobile) {
            this.renderWeekViewMobile(weekData);
        } else {
            this.renderWeekViewDesktop(weekData);
        }
    }

    // Тижневий вигляд на desktop
    async renderWeekViewDesktop(weekData) {
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця"];
        const allLessons = scheduleAPI.getAllLessonsFromWeek(weekData);
        
        let tableHTML = `
            <div class="week-view-desktop">
                <div class="mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        ${weekData.settings.displayName}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">
                        ${await config.formatDateForDisplay(weekData.startDate)} - ${await config.formatDateForDisplay(weekData.endDate)}
                    </p>
                    ${weekData.successfulDays < 5 ? `<p class="text-xs text-yellow-600">Завантажено ${weekData.successfulDays}/5 днів</p>` : ''}
                </div>
                
                <div class="overflow-x-auto">
                    <table class="schedule-table" style="min-width: 800px;">
                        <thead>
                            <tr>
                                <th style="width: 100px;">Час</th>
                                ${dayNames.map(day => `<th>${day}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;

        // Рендеримо кожну пару (1-7)
        for (let lessonNum = 1; lessonNum <= 7; lessonNum++) {
            const period = this.periods.find(p => p.number == lessonNum);
            const timeStr = period ? `${period.start}<br>${period.end}` : `${lessonNum} пара`;
            
            tableHTML += `
                <tr>
                    <td class="text-sm text-center font-medium">
                        <div class="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-semibold text-xs mx-auto mb-1">
                            ${lessonNum}
                        </div>
                        <div class="text-xs text-gray-600">${timeStr}</div>
                    </td>
            `;

            // Кожен день тижня
            for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
                const daySchedule = weekData.schedules[dayIndex];
                const lesson = daySchedule?.schedule?.[lessonNum];
                
                if (lesson) {
                    tableHTML += `
                        <td class="p-2">
                            <div class="text-xs font-medium mb-1">${lesson.title}</div>
                            ${this.renderLessonTypeBadge(lesson, 'xs')}
                            <div class="text-xs text-gray-500 mt-1">
                                ${lesson.instructorName || lesson.group || ''}
                            </div>
                            ${lesson.room ? `<div class="text-xs text-gray-500">${lesson.room}</div>` : ''}
                        </td>
                    `;
                } else {
                    tableHTML += `<td class="p-2 text-center text-gray-300">-</td>`;
                }
            }

            tableHTML += `</tr>`;
        }

        tableHTML += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        this.elements.mainContent.innerHTML = tableHTML;
    }

    // Тижневий вигляд на mobile (вертикальні картки днів)
    renderWeekViewMobile(weekData) {
        const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця"];
        
        let cardsHTML = `
            <div class="week-view-mobile">
                <div class="mb-4 text-center">
                    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                        ${weekData.settings.displayName}
                    </h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Тижневий розклад</p>
                    ${weekData.successfulDays < 5 ? `<p class="text-xs text-yellow-600">Завантажено ${weekData.successfulDays}/5 днів</p>` : ''}
                </div>
        `;

        weekData.schedules.forEach((daySchedule, dayIndex) => {
            if (!daySchedule) {
                cardsHTML += `
                    <div class="day-card mb-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <h4 class="font-semibold text-gray-900 dark:text-white mb-2">
                            📅 ${dayNames[dayIndex]}
                        </h4>
                        <p class="text-sm text-gray-500">Не вдалося завантажити розклад</p>
                    </div>
                `;
                return;
            }

            const hasLessons = scheduleAPI.hasScheduleData(daySchedule);
            
            cardsHTML += `
                <div class="day-card mb-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
                    <h4 class="font-semibold text-gray-900 dark:text-white mb-3">
                        📅 ${dayNames[dayIndex]}
                    </h4>
            `;

            if (hasLessons) {
                const scheduleEntries = Object.entries(daySchedule.schedule);
                
                scheduleEntries.forEach(([lessonNumber, lesson]) => {
                    const period = this.periods.find(p => p.number == lessonNumber);
                    const timeStr = period ? `${period.start}-${period.end}` : '';
                    
                    cardsHTML += `
                        <div class="lesson-item mb-3 pb-3 border-b border-gray-100 dark:border-gray-600 last:border-b-0">
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center">
                                    <span class="w-6 h-6 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs mr-2">
                                        ${lessonNumber}
                                    </span>
                                    <span class="text-xs text-gray-500">${timeStr}</span>
                                </div>
                                ${this.renderLessonTypeBadge(lesson, 'xs')}
                            </div>
                            <div class="text-sm font-medium text-gray-900 dark:text-white mb-1">
                                ${lesson.title}
                            </div>
                            <div class="text-xs text-gray-600 dark:text-gray-400">
                                ${lesson.instructorName || lesson.group || ''}
                                ${lesson.room ? ` • ${lesson.room}` : ''}
                            </div>
                        </div>
                    `;
                });
            } else {
                cardsHTML += `
                    <p class="text-sm text-gray-500 text-center py-4">
                        Занять немає
                    </p>
                `;
            }

            cardsHTML += `</div>`;
        });

        cardsHTML += `</div>`;
        this.elements.mainContent.innerHTML = cardsHTML;
    }

    // === ДОПОМІЖНІ МЕТОДИ РЕНДЕРИНГУ ===

    // Рендеринг бейджа типу заняття
    renderLessonTypeBadge(lesson, size = 'sm') {
        const typeInfo = lesson.typeInfo;
        
        if (!typeInfo) {
            return `<span class="lesson-type-badge" style="background-color: #6b7280;">${lesson.type}</span>`;
        }

        const sizeClasses = {
            xs: 'text-xs px-1 py-0.5',
            sm: 'text-xs px-2 py-1',
            md: 'text-sm px-2 py-1'
        };  
			
			return `
            <span class="lesson-type-badge ${sizeClasses[size]}" style="background-color: ${typeInfo.color};">
                <i class="${typeInfo.icon} mr-1"></i>${typeInfo.shortName}
            </span>
        `;
    }

    // === СТАНИ UI ===

    // Рендеринг стану завантаження
    renderLoadingState() {
        this.elements.mainContent.innerHTML = `
            <div class="loading-state">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                <p class="text-gray-600 dark:text-gray-400">${this.messages?.loading || 'Завантаження...'}</p>
            </div>
        `;
    }

    // Рендеринг стану помилки
    renderErrorState(error) {
        const errorMessage = error?.message || this.messages?.error || 'Помилка завантаження';
        const showDetails = error?.details && error.showDetails;
        
        this.elements.mainContent.innerHTML = `
            <div class="error-state">
                <div class="flex items-center mb-3">
                    <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                    <h4 class="font-semibold">Помилка завантаження розкладу</h4>
                </div>
                <p class="mb-3">${errorMessage}</p>
                ${showDetails ? `<details class="text-sm mb-3">
                    <summary class="cursor-pointer">Технічні деталі</summary>
                    <p class="mt-2 p-2 bg-red-50 rounded text-red-700">${error.details}</p>
                </details>` : ''}
                <div class="flex gap-2">
                    <button class="retry-btn px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors">
                        <i class="fas fa-redo mr-2"></i>${this.messages?.retry || 'Спробувати знову'}
                    </button>
                    <button class="cache-btn px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">
                        <i class="fas fa-database mr-2"></i>Очистити кеш
                    </button>
                </div>
            </div>
        `;

        // Додаємо обробники кнопок
        const retryBtn = this.elements.mainContent.querySelector('.retry-btn');
        const cacheBtn = this.elements.mainContent.querySelector('.cache-btn');
        
        retryBtn?.addEventListener('click', () => {
            this.loadAndRenderSchedule();
        });
        
        cacheBtn?.addEventListener('click', async () => {
            await scheduleAPI.clearScheduleCache();
            this.loadAndRenderSchedule();
        });
    }

    // Рендеринг порожнього стану
    renderEmptyState(message = null) {
        const emptyMessage = message || 
                           (this.currentView === 'day' ? 'На цей день розклад відсутній' : 'На цей тиждень розклад відсутній');
        
        this.elements.mainContent.innerHTML = `
            <div class="empty-state">
                <div class="text-6xl mb-4">📅</div>
                <h3 class="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    ${this.messages?.noData || 'Дані відсутні'}
                </h3>
                <p class="text-gray-600 dark:text-gray-400 mb-4">${emptyMessage}</p>
                <button class="check-other-btn px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors">
                    <i class="fas fa-calendar-alt mr-2"></i>Обрати іншу дату
                </button>
            </div>
        `;

        // Обробник кнопки вибору іншої дати
        const checkOtherBtn = this.elements.mainContent.querySelector('.check-other-btn');
        checkOtherBtn?.addEventListener('click', () => {
            this.elements.dateInput?.focus();
        });
    }

    // === МЕТОДИ НАВІГАЦІЇ ===

    // Перемикання вигляду
    switchView(newView) {
        if (newView === this.currentView) return;
        
        this.currentView = newView;
        
        // Оновлюємо кнопки
        this.elements.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === newView);
        });
        
        // Перезавантажуємо дані
        if (this.currentSettings) {
            this.loadAndRenderSchedule();
        }
    }

    // Встановлення дати
    setDate(date) {
        this.currentDate = new Date(date);
        this.updateDateInput();
        
        if (this.currentSettings) {
            this.loadAndRenderSchedule();
        }
    }

    // Навігація по періодах (день/тиждень)
    navigatePeriod(direction) {
        const newDate = new Date(this.currentDate);
        
        if (this.currentView === 'day') {
            newDate.setDate(newDate.getDate() + direction);
        } else if (this.currentView === 'week') {
            newDate.setDate(newDate.getDate() + (direction * 7));
        }
        
        this.setDate(newDate);
    }

    // === ДОПОМІЖНІ МЕТОДИ ===

    // Оновлення контролів UI
    updateControls() {
        this.updateDateInput();
        this.updateViewButtons();
    }

    // Оновлення поля дати
    updateDateInput() {
        if (this.elements.dateInput) {
            const dateStr = this.currentDate.toISOString().split('T')[0];
            this.elements.dateInput.value = dateStr;
        }
    }

    // Оновлення кнопок вигляду
    updateViewButtons() {
        this.elements.viewButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === this.currentView);
        });
    }

    // Перевірка ініціалізації
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    // === ПУБЛІЧНІ МЕТОДИ ===

    // Оновлення розкладу
    async refresh() {
        if (this.currentSettings) {
            await this.loadAndRenderSchedule();
        }
    }

    // Встановлення налаштувань
    setSettings(settings) {
        this.currentSettings = settings;
    }

    // Отримання поточних налаштувань
    getSettings() {
        return this.currentSettings;
    }

    // Отримання поточної дати
    getCurrentDate() {
        return new Date(this.currentDate);
    }

    // Отримання поточного вигляду
    getCurrentView() {
        return this.currentView;
    }

    // Отримання поточних даних
    getCurrentData() {
        return this.currentData;
    }

    // Перевірка чи є дані
    hasData() {
        return this.currentData !== null;
    }

    // === МЕТОДИ ДЛЯ ЕКСПОРТУ/ІМПОРТУ ===

    // Експорт поточного розкладу в JSON
    exportScheduleData() {
        if (!this.currentData) return null;
        
        return {
            settings: this.currentSettings,
            view: this.currentView,
            date: this.currentDate.toISOString(),
            data: this.currentData,
            exportedAt: new Date().toISOString()
        };
    }

    // Генерація тексту розкладу для копіювання
    generateScheduleText() {
        if (!this.currentData) return '';
        
        let text = '';
        
        if (this.currentView === 'day' && this.currentData.schedule) {
            text += `📅 ${this.currentData.displayTitle}\n`;
            text += `📆 ${this.currentData.formattedDate}\n\n`;
            
            Object.entries(this.currentData.schedule).forEach(([lessonNumber, lesson]) => {
                const period = this.periods.find(p => p.number == lessonNumber);
                const timeStr = period ? `${period.start}-${period.end}` : '';
                
                text += `${lessonNumber}. ${timeStr}\n`;
                text += `   📚 ${lesson.title}\n`;
                text += `   📝 ${lesson.type}\n`;
                if (lesson.instructorName) text += `   👨‍🏫 ${lesson.instructorName}\n`;
                if (lesson.room) text += `   📍 ${lesson.room}\n`;
                text += '\n';
            });
        } else if (this.currentView === 'week' && this.currentData.schedules) {
            const dayNames = ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця"];
            
            text += `📅 ${this.currentData.settings.displayName}\n`;
            text += `📆 Тижневий розклад\n\n`;
            
            this.currentData.schedules.forEach((daySchedule, dayIndex) => {
                text += `=== ${dayNames[dayIndex]} ===\n`;
                
                if (daySchedule && scheduleAPI.hasScheduleData(daySchedule)) {
                    Object.entries(daySchedule.schedule).forEach(([lessonNumber, lesson]) => {
                        const period = this.periods.find(p => p.number == lessonNumber);
                        const timeStr = period ? `${period.start}-${period.end}` : '';
                        
                        text += `${lessonNumber}. ${timeStr} - ${lesson.title} (${lesson.type})\n`;
                    });
                } else {
                    text += 'Занять немає\n';
                }
                
                text += '\n';
            });
        }
        
        return text;
    }

    // === МЕТОДИ ОБРОБКИ ПОМИЛОК ===

    // Показ toast повідомлення
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white text-sm font-medium transition-all duration-300 transform translate-x-full`;
        
        const bgColors = {
            info: 'bg-blue-500',
            success: 'bg-green-500',
            warning: 'bg-yellow-500',
            error: 'bg-red-500'
        };
        
        toast.classList.add(bgColors[type] || bgColors.info);
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Анімація появи
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);
        
        // Автоматичне приховування
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Очищення ресурсів
    destroy() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        // Видаляємо стилі
        const styles = document.querySelector('#schedule-renderer-styles');
        if (styles) {
            styles.remove();
        }
        
        this.isInitialized = false;
        this.currentData = null;
        this.currentSettings = null;
    }
}

// Експортуємо єдиний екземпляр
export const scheduleRenderer = new ScheduleRenderer();
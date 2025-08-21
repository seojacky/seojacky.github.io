import { config } from './config-loader.js';

// Глобальні змінні
let selectedDate = new Date();

// DOM елементи
const scheduleContainer = document.getElementById('schedule-container');
const currentTimeElement = document.getElementById('current-time');
const currentDateElement = document.getElementById('current-date');
const selectedDateElement = document.getElementById('selected-date');

// Дні тижня
const weekDays = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

// Функція для отримання поточного часу в Києві (з popup.js рядок 366)
async function getKyivCurrentTime() {
    const timeZone = await config.getTimeZone();
    
    const options = {
        timeZone: timeZone,
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    };

    const formatter = new Intl.DateTimeFormat([], options);
    const parts = formatter.formatToParts(new Date());
    
    const hours = parts.find(part => part.type === 'hour').value;
    const minutes = parts.find(part => part.type === 'minute').value;
    
    return parseInt(hours) * 60 + parseInt(minutes);
}

// Оновлення поточного часу
function updateCurrentTime() {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    currentTimeElement.textContent = `${hours}:${minutes}:${seconds}`;
    
    // Оновлюємо поточну дату
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateElement.textContent = now.toLocaleDateString('uk-UA', options);
}

// Перевірка чи вибрана дата сьогоднішня
function isSelectedDateToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    return selected.getTime() === today.getTime();
}

// Оновлення відображення вибраної дати
function updateSelectedDateDisplay() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    if (selected.getTime() === today.getTime()) {
        selectedDateElement.textContent = "Сьогодні";
    } else {
        const dayName = weekDays[selectedDate.getDay()];
        const dateStr = selectedDate.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
        selectedDateElement.textContent = `${dayName}, ${dateStr}`;
    }
}

// Рендер розкладу з конфігурації
async function renderSchedule() {
    const schedule = await config.getBellSchedule();
    const isToday = isSelectedDateToday();
    
    let html = '';
    
    schedule.forEach((item, index) => {
        const nextItem = schedule[index + 1];
        
        // Рендер пари
        html += `
            <div class="p-4 transition-all duration-200" data-start="${item.start}" data-end="${item.end}">
                <div class="flex justify-between items-center">
                    <div class="flex items-center">
                        <span class="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold mr-3">
                            ${item.number}
                        </span>
                        <div>
                            <p class="font-medium">${item.start} - ${item.end}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Рендер перерви
        if (nextItem && item.breakAfter > 0) {
            html += `
                <div class="px-4 py-2 transition-all duration-200 break" data-start="${item.end}" data-end="${nextItem.start}">
                    <div class="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <span class="w-8 h-8 flex items-center justify-center mr-3">•</span>
                        <div>
                            <p>Перерва ${item.breakAfter} хв</p>
                        </div>
                    </div>
                </div>
            `;
        }
    });
    
    scheduleContainer.innerHTML = html;
    
    // Підсвітка поточної пари (якщо сьогодні)
    if (isToday) {
        await highlightCurrentClass();
    }
}

// Підсвітка поточної пари/перерви (адаптована з popup.js рядок 324)
async function highlightCurrentClass() {
    const scheduleItems = document.querySelectorAll('#schedule-container > div');
    const currentTime = await getKyivCurrentTime();

    scheduleItems.forEach(item => {
        const startTime = item.getAttribute('data-start');
        const endTime = item.getAttribute('data-end');
        
        if (startTime && endTime) {
            const startTimeArray = startTime.split(':');
            const endTimeArray = endTime.split(':');
            const startMinutes = parseInt(startTimeArray[0]) * 60 + parseInt(startTimeArray[1]);
            const endMinutes = parseInt(endTimeArray[0]) * 60 + parseInt(endTimeArray[1]);

            if (currentTime >= startMinutes && currentTime < endMinutes) {
                if (item.classList.contains('break')) {
                    item.classList.add('current-break');
                    item.style.backgroundColor = '#f59e0b';
                    
                    // Додаємо індикатор "Перерва зараз"
                    const indicator = item.querySelector('.break-indicator');
                    if (!indicator) {
                        const breakDiv = item.querySelector('div > div');
                        breakDiv.innerHTML += '<span class="bg-orange-500 text-white text-xs font-semibold px-2 py-1 rounded-full ml-auto break-indicator">Перерва зараз</span>';
                    }
                } else {
                    item.classList.add('current-class');
                    item.classList.add('current', 'pulse');
                    
                    // Оновлюємо стилі кружечка та тексту
                    const circle = item.querySelector('span');
                    circle.className = 'w-8 h-8 flex items-center justify-center rounded-full bg-white text-indigo-600 font-semibold mr-3';
                    
                    // Додаємо індикатор "Зараз"
                    const indicator = item.querySelector('.current-indicator');
                    if (!indicator) {
                        const controlDiv = item.querySelector('.flex.justify-between');
                        controlDiv.innerHTML += '<span class="bg-white text-indigo-600 text-xs font-semibold px-2 py-1 rounded-full current-indicator">Зараз</span>';
                    }
                }
            } else {
                item.classList.remove('current-class', 'current-break', 'current', 'pulse');
                item.style.backgroundColor = 'transparent';
                
                // Видаляємо індикатори
                const currentIndicator = item.querySelector('.current-indicator');
                const breakIndicator = item.querySelector('.break-indicator');
                if (currentIndicator) currentIndicator.remove();
                if (breakIndicator) breakIndicator.remove();
                
                // Повертаємо стандартні стилі кружечка
                const circle = item.querySelector('span');
                if (circle && !item.classList.contains('break')) {
                    circle.className = 'w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-semibold mr-3';
                }
            }
        }
    });
}

// Перевірка поточної пари та оновлення UI
function checkCurrentPair() {
    if (isSelectedDateToday()) {
        highlightCurrentClass();
    }
}

// Ініціалізація
async function init() {
    updateCurrentTime();
    updateSelectedDateDisplay();
    await renderSchedule();
    
    // Оновлення часу кожну секунду
    setInterval(updateCurrentTime, 1000);
    setInterval(checkCurrentPair, 10000); // Перевіряємо поточну пару кожні 10 секунд
}

// Запуск при завантаженні DOM
document.addEventListener('DOMContentLoaded', init);
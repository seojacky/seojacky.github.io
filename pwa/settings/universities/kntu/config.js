// config.js - Конфігурація розкладу дзвінків ХНТУ
export default {
  "university": {
    "code": "kntu",
    "name": "Херсонський національний технічний університет",
    "shortName": "ХНТУ",
    "timeZone": "Europe/Kiev"
  },
  "schedule": {
    "bellSchedule": [
      {
        "number": 1,
        "start": "08:30",
        "end": "09:50",
        "duration": 80,
        "breakAfter": 15
      },
      {
        "number": 2,
        "start": "10:05",
        "end": "11:25",
        "duration": 80,
        "breakAfter": 15
      },
      {
        "number": 3,
        "start": "11:40",
        "end": "13:00",
        "duration": 80,
        "breakAfter": 15
      },
      {
        "number": 4,
        "start": "13:15",
        "end": "14:35",
        "duration": 80,
        "breakAfter": 15
      },
      {
        "number": 5,
        "start": "14:50",
        "end": "16:10",
        "duration": 80,
        "breakAfter": 15
      },
      {
        "number": 6,
        "start": "16:25",
        "end": "17:45",
        "duration": 80,
        "breakAfter": 15
      },
      {
        "number": 7,
        "start": "18:00",
        "end": "19:20",
        "duration": 80,
        "breakAfter": 0
      }
    ],
    "academicYear": {
      "startDate": "2025-09-01",
      "endDate": "2026-08-30"
    }
  },
  
  // === НОВА СЕКЦІЯ: API КОНФІГУРАЦІЯ ===
  "api": {
    "baseUrl": "https://sheduleapi.kntu.pp.ua/api",
    "timeout": 10000,
    "cache": {
      "enabled": true,
      "duration": 24 * 60 * 60 * 1000,  // 24 години в мілісекундах
      "maxSize": 100  // максимальна кількість записів в кеші
    },
    "endpoints": {
      // Довідники
      "faculties": "/faculties/get-all",
      "groups": "/groups/get-all-by-id-faculty",
      "cafedras": "/cafedras/get-all-by-id-faculty", 
      "instructors": "/instructors/get-all-by-cafedra",
      
      // Розклад
      "scheduleGroup": "/schedule/group/get-all-by-day",
      "scheduleInstructor": "/schedule/instructor/get-all-by-day"
    },
    "retries": {
      "maxAttempts": 3,
      "delay": 1000  // затримка між спробами в мс
    }
  },
  
  // === НОВА СЕКЦІЯ: FEATURES ===
  "features": {
    "bellSchedule": true,
    "classSchedule": true,
    "offlineCache": true,
    "darkMode": true,
    "weekCalculator": true
  },
  
  // === НОВА СЕКЦІЯ: UI КОНФІГУРАЦІЯ ===
  "ui": {
    "schedule": {
      "defaultView": "day",  // day | week
      "showWeekends": false,
      "showEmptyPeriods": true,
      "compactMode": false
    },
    "modal": {
      "closeOnBackdrop": true,
      "closeOnEscape": true,
      "animations": true
    },
    "responsive": {
      "mobileBreakpoint": 768,
      "tabletBreakpoint": 1024
    }
  },
  
  // === НОВА СЕКЦІЯ: ЛОКАЛІЗАЦІЯ ===
  "localization": {
    "language": "uk",
    "dateFormat": "DD.MM.YYYY",
    "timeFormat": "HH:mm",
    "weekStart": 1,  // Понеділок
    "messages": {
      "loading": "Завантаження...",
      "error": "Помилка завантаження",
      "noData": "Дані відсутні",
      "retry": "Спробувати знову",
      "save": "Зберегти",
      "cancel": "Скасувати",
      "close": "Закрити"
    },
    "days": {
      "short": ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"],
      "long": ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"]
    },
    "months": {
      "short": ["Січ", "Лют", "Бер", "Кві", "Тра", "Чер", "Лип", "Сер", "Вер", "Жов", "Лис", "Гру"],
      "long": ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"]
    }
  },
  
  // === НОВА СЕКЦІЯ: НАЛАШТУВАННЯ РОЗКЛАДУ ЗАНЯТЬ ===
  "classSchedule": {
    "lessonTypes": {
      "lecture": {
        "name": "Лекція",
        "shortName": "Лек",
        "color": "#3B82F6",
        "icon": "fas fa-chalkboard-teacher"
      },
      "practice": {
        "name": "Практичне заняття", 
        "shortName": "Прак",
        "color": "#10B981",
        "icon": "fas fa-users"
      },
      "lab": {
        "name": "Лабораторна робота",
        "shortName": "Лаб", 
        "color": "#F59E0B",
        "icon": "fas fa-flask"
      },
      "seminar": {
        "name": "Семінар",
        "shortName": "Сем",
        "color": "#8B5CF6",
        "icon": "fas fa-comments"
      },
      "exam": {
        "name": "Екзамен",
        "shortName": "Екз",
        "color": "#EF4444", 
        "icon": "fas fa-clipboard-check"
      },
      "consultation": {
        "name": "Консультація",
        "shortName": "Конс",
        "color": "#6B7280",
        "icon": "fas fa-question-circle"
      }
    },
    "periods": [
      { "number": 1, "start": "08:30", "end": "09:50" },
      { "number": 2, "start": "10:05", "end": "11:25" },
      { "number": 3, "start": "11:40", "end": "13:00" },
      { "number": 4, "start": "13:15", "end": "14:35" },
      { "number": 5, "start": "14:50", "end": "16:10" },
      { "number": 6, "start": "16:25", "end": "17:45" },
      { "number": 7, "start": "18:00", "end": "19:20" }
    ]
  },
  
  // === РОЗШИРЕНІ НАЛАШТУВАННЯ КЕШУВАННЯ ===
  "caching": {
    "strategies": {
      "faculties": {
        "storage": "localStorage",
        "duration": 7 * 24 * 60 * 60 * 1000,  // 7 днів (рідко змінюються)
        "prefix": "kntu_faculties"
      },
      "groups": {
        "storage": "sessionStorage", 
        "duration": 24 * 60 * 60 * 1000,  // 1 день
        "prefix": "kntu_groups"
      },
      "cafedras": {
        "storage": "sessionStorage",
        "duration": 24 * 60 * 60 * 1000,  // 1 день  
        "prefix": "kntu_cafedras"
      },
      "instructors": {
        "storage": "sessionStorage",
        "duration": 24 * 60 * 60 * 1000,  // 1 день
        "prefix": "kntu_instructors"
      },
      "schedule": {
        "storage": "sessionStorage",
        "duration": 60 * 60 * 1000,  // 1 година (часто змінюється)
        "prefix": "kntu_schedule"
      }
    }
  },
  
  // === НАЛАШТУВАННЯ ПОМИЛОК ===
  "errorHandling": {
    "showDetails": false,  // показувати технічні деталі помилок
    "autoRetry": true,
    "retryDelay": 2000,
    "maxRetries": 2,
    "fallbackToCache": true,
    "showOfflineMessage": true
  },
  
  // === МЕТАІНФОРМАЦІЯ ===
  "meta": {
    "version": "1.6.1",
    "lastUpdated": "2025-08-23",
    "author": "KNTU Development Team",
    "description": "Конфігурація PWA розкладу дзвінків та навчальних занять ХНТУ"
  }
};

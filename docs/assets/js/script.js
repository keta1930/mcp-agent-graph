// Global variables
let currentLang = 'en';
let translations = {};
let currentModule = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Load translations
    await loadTranslations();

    // Initialize theme
    initializeTheme();

    // Initialize language toggle
    initializeLanguageToggle();

    // Initialize navigation
    initializeNavigation();

    // Load initial content
    loadModule('installation');

    // Initialize syntax highlighting
    hljs.highlightAll();
}

// Translation system
async function loadTranslations() {
    try {
        const [enResponse, zhResponse] = await Promise.all([
            fetch('./assets/i18n/en.json'),
            fetch('./assets/i18n/zh.json')
        ]);

        const enData = await enResponse.json();
        const zhData = await zhResponse.json();

        translations = {
            en: enData,
            zh: zhData
        };

        // Set initial language from localStorage or default to 'en'
        currentLang = localStorage.getItem('lang') || 'en';
        updateLanguage(currentLang);
    } catch (error) {
        console.error('Failed to load translations:', error);
    }
}

function updateLanguage(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);

    // Update HTML lang attribute
    document.documentElement.lang = lang;

    // Update language toggle display
    document.getElementById('currentLang').textContent = lang.toUpperCase();

    // Update language menu
    document.querySelectorAll('.lang-option').forEach(option => {
        const optionLang = option.dataset.lang;
        const checkIcon = option.querySelector('.fas.fa-check');
        if (optionLang === lang) {
            checkIcon.classList.remove('invisible');
            option.classList.add('bg-blue-50', 'text-blue-700');
        } else {
            checkIcon.classList.add('invisible');
            option.classList.remove('bg-blue-50', 'text-blue-700');
        }
    });

    // Update all translatable elements
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translation = getTranslation(key);
        if (translation) {
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = translation;
            } else {
                element.textContent = translation;
            }
        }
    });

    // Reload current module to get translated content
    if (currentModule) {
        loadModule(currentModule);
    }
}

function getTranslation(key) {
    const keys = key.split('.');
    let value = translations[currentLang];

    for (const k of keys) {
        if (value && typeof value === 'object') {
            value = value[k];
        } else {
            return null;
        }
    }

    return value || translations.en?.[key] || key;
}

// Theme system
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}

function setTheme(theme) {
    document.body.dataset.theme = theme;
    const themeIcon = document.getElementById('themeIcon');

    if (theme === 'dark') {
        themeIcon.className = 'fas fa-sun';
        document.getElementById('highlight-theme').href =
            'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
    } else {
        themeIcon.className = 'fas fa-moon';
        document.getElementById('highlight-theme').href =
            'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
    }

    localStorage.setItem('theme', theme);
}

function toggleTheme() {
    const currentTheme = document.body.dataset.theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

// Language toggle
function initializeLanguageToggle() {
    const langToggle = document.getElementById('langToggle');
    const langMenu = document.getElementById('langMenu');

    langToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        langMenu.classList.toggle('hidden');
    });

    document.addEventListener('click', function() {
        langMenu.classList.add('hidden');
    });

    document.querySelectorAll('.lang-option').forEach(option => {
        option.addEventListener('click', function() {
            const lang = this.dataset.lang;
            updateLanguage(lang);
            langMenu.classList.add('hidden');
        });
    });
}

// Navigation system
function initializeNavigation() {
    // Handle navigation links
    document.querySelectorAll('.nav-link, .nav-link-button').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href') || this.dataset.target;
            if (target) {
                const module = target.replace('#', '');
                loadModule(module);
            }
        });
    });
}

// Module loading system
async function loadModule(moduleName) {
    try {
        // Update active navigation
        updateActiveNav(moduleName);

        // Show loading state
        const container = document.getElementById('content-container');
        container.innerHTML = '<div class="text-center py-20"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>';

        // Load module content
        const response = await fetch(`./modules/${moduleName}.html`);
        if (!response.ok) {
            throw new Error(`Failed to load module: ${moduleName}`);
        }

        const content = await response.text();
        container.innerHTML = content;

        // Update current module
        currentModule = moduleName;

        // Reinitialize syntax highlighting for new content
        container.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
        console.error('Error loading module:', error);
        document.getElementById('content-container').innerHTML = `
            <div class="text-center py-20">
                <i class="fas fa-exclamation-triangle text-2xl text-red-500 mb-4"></i>
                <h3 class="text-lg font-semibold text-gray-900 mb-2">Error Loading Content</h3>
                <p class="text-gray-600">Failed to load the requested documentation section.</p>
            </div>
        `;
    }
}

function updateActiveNav(moduleName) {
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    // Add active class to current link
    const activeLink = document.querySelector(`.nav-link[href="#${moduleName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
}

// Utility functions
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show a brief success indication
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50';
        toast.textContent = 'Copied to clipboard!';
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 2000);
    }).catch(() => {
        console.error('Failed to copy to clipboard');
    });
}

// Add copy buttons to code blocks
function addCopyButtons() {
    document.querySelectorAll('pre code').forEach(block => {
        const button = document.createElement('button');
        button.className = 'absolute top-2 right-2 p-1 text-gray-500 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity';
        button.innerHTML = '<i class="fas fa-copy"></i>';
        button.onclick = () => copyToClipboard(block.textContent);

        const container = block.closest('pre');
        container.style.position = 'relative';
        container.classList.add('group');
        container.appendChild(button);
    });
}

// Initialize copy buttons after content loads
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
            addCopyButtons();
        }
    });
});

observer.observe(document.getElementById('content-container'), {
    childList: true,
    subtree: true
});
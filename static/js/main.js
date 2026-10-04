/**
 * AeroShield – Global JavaScript Module
 * Theme management, Station synchronization across tabs, Toast notifications, Utility functions
 */

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupThemeToggle();
});

function initTheme() {
    const savedTheme = localStorage.getItem('aeroshield_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function setupThemeToggle() {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('aeroshield_theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.innerHTML = theme === 'dark' ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
}

// Global Station State Synchronization across pages
function getSelectedStation() {
    return localStorage.getItem('aeroshield_selected_station') || 'AP001';
}

function setSelectedStation(stationId) {
    if (!stationId) return;
    localStorage.setItem('aeroshield_selected_station', stationId);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    if (type === 'warning') icon = '<i class="fa-solid fa-triangle-exclamation"></i>';
    if (type === 'error') icon = '<i class="fa-solid fa-circle-xmark"></i>';
    
    toast.innerHTML = `${icon} <span>${message}</span>`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Global Category Color Helper
function getCategoryColor(category) {
    const cat = (category || '').toLowerCase();
    if (cat.includes('good')) return '#10b981';
    if (cat.includes('satisfactory')) return '#84cc16';
    if (cat.includes('moderate')) return '#eab308';
    if (cat.includes('poor') && !cat.includes('very')) return '#f97316';
    if (cat.includes('very poor')) return '#ef4444';
    if (cat.includes('severe')) return '#991b1b';
    return '#6b7280';
}

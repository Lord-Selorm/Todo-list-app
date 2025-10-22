class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.draggedItem = null;
        this.currentEditingId = null;
        
        // DOM Elements
        this.dom = {
            todoInput: document.getElementById('todo-input'),
            addBtn: document.getElementById('add-btn'),
            todoList: document.getElementById('todo-list'),
            filters: document.getElementById('filters'),
            clearCompletedBtn: document.getElementById('clear-completed'),
            activeCount: document.getElementById('active-count'),
            completedCount: document.getElementById('completed-count'),
            emptyState: document.getElementById('empty-state'),
            loadingState: document.getElementById('loading'),
            themeToggle: document.getElementById('theme-toggle'),
            toast: document.getElementById('toast'),
            // Reminder modal elements
            reminderModal: document.getElementById('reminder-modal'),
            closeReminderModal: document.getElementById('close-reminder-modal'),
            cancelReminderBtn: document.getElementById('cancel-reminder'),
            saveReminderBtn: document.getElementById('save-reminder'),
            reminderDateInput: document.getElementById('reminder-date'),
            reminderTimeInput: document.getElementById('reminder-time'),
            reminderRepeatSelect: document.getElementById('reminder-repeat'),
            addFirstTaskBtn: document.getElementById('add-first-task')
        };
        
        // Set minimum date to today
        const today = new Date().toISOString().split('T')[0];
        this.dom.reminderDateInput.min = today;
        
        // Initialize the app
        this.init();
    }
    
    async init() {
        this.setupEventListeners();
        await this.loadTodos();
        this.renderTodos();
        this.setupTheme();
    }
    
    setupEventListeners() {
        // Add todo
        this.dom.addBtn.addEventListener('click', () => this.addTodo());
        this.dom.todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTodo();
        });
        
        // Filter todos
        this.dom.filters.addEventListener('click', (e) => {
            const filterBtn = e.target.closest('.filter-btn');
            if (!filterBtn) return;
            
            this.setFilter(filterBtn.dataset.filter);
            this.updateActiveFilter();
        });
        
        // Clear completed todos
        this.dom.clearCompletedBtn.addEventListener('click', () => this.clearCompleted());
        
        // Reminder modal
        this.dom.closeReminderModal.addEventListener('click', () => this.closeReminderModal());
        this.dom.cancelReminderBtn.addEventListener('click', () => this.closeReminderModal());
        this.dom.saveReminderBtn.addEventListener('click', () => this.saveReminder());
        this.dom.addFirstTaskBtn?.addEventListener('click', () => this.dom.todoInput.focus());
        
        // Theme toggle
        this.dom.themeToggle.addEventListener('change', () => this.toggleTheme());
        
        // Drag and drop
        this.setupDragAndDrop();
    }
    
    loadTodos() {
        return new Promise((resolve) => {
            // Request notification permission on page load
            if ('Notification' in window) {
                Notification.requestPermission();
            }
            
            // Simulate loading
            setTimeout(() => {
                const savedTodos = localStorage.getItem('todos');
                if (savedTodos) {
                    this.todos = JSON.parse(savedTodos);
                    // Schedule any pending reminders
                    this.todos.forEach(todo => {
                        if (todo.reminder) {
                            this.scheduleReminderNotification(todo);
                        }
                    });
                }
                this.dom.loadingState.style.display = 'none';
                resolve();
            }, 500);
        });
    }
    
    saveTodos() {
        try {
            localStorage.setItem('todos', JSON.stringify(this.todos));
        } catch (error) {
            console.error('Error saving todos:', error);
            this.showToast('Error saving tasks', 'error');
        }
    }
    
    addTodo() {
        const text = this.dom.todoInput.value.trim();
        if (!text) {
            this.showToast('Please enter a task', 'warning');
            return;
        }
        
        const newTodo = {
            id: Date.now().toString(),
            text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        this.todos.unshift(newTodo);
        this.saveTodos();
        this.renderTodos();
        this.dom.todoInput.value = '';
        this.dom.emptyState.style.display = 'none';
        this.showToast('Task added successfully');
    }
    
    // toggleTodo is now replaced by toggleTodoComplete
    
    deleteTodo(id) {
        this.todos = this.todos.filter(todo => todo.id !== id);
        this.saveTodos();
        this.renderTodos();
        
        if (this.todos.length === 0) {
            this.dom.emptyState.style.display = 'flex';
        }
        
        this.showToast('Task deleted');
    }
    
    clearCompleted() {
        const completedCount = this.todos.filter(todo => todo.completed).length;
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear', 'info');
            return;
        }
        
        if (confirm(`Are you sure you want to clear ${completedCount} completed task${completedCount > 1 ? 's' : ''}?`)) {
            this.todos = this.todos.filter(todo => !todo.completed);
            this.saveTodos();
            this.renderTodos();
            this.showToast('Cleared completed tasks');
        }
    }
    
    setFilter(filter) {
        this.currentFilter = filter;
        this.renderTodos();
    }
    
    updateActiveFilter() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === this.currentFilter);
        });
    }
    
    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'pending':
                return this.todos.filter(todo => !todo.completed);
            case 'completed':
                return this.todos.filter(todo => todo.completed);
            default:
                return [...this.todos]; // Return a copy to prevent mutation
        }
    }
    
    updateStats() {
        const activeCount = this.todos.filter(todo => !todo.completed).length;
        const completedCount = this.todos.length - activeCount;
        
        this.dom.activeCount.textContent = activeCount;
        this.dom.completedCount.textContent = completedCount;
        
        // Toggle clear completed button visibility
        this.dom.clearCompletedBtn.style.visibility = completedCount > 0 ? 'visible' : 'hidden';
    }
    
    renderTodos() {
        const filteredTodos = this.getFilteredTodos();
        
        // Update stats
        this.updateStats();
        
        // Clear the list
        this.dom.todoList.innerHTML = '';
        
        // Show empty state if no todos
        if (filteredTodos.length === 0) {
            this.dom.emptyState.style.display = 'flex';
            return;
        }
        
        // Hide empty state
        this.dom.emptyState.style.display = 'none';
        
        // Render todos
        filteredTodos.forEach((todo, index) => {
            const todoElement = this.createTodoElement(todo, index);
            this.dom.todoList.appendChild(todoElement);
        });
        
        // Update active filter UI
        this.updateActiveFilter();
    }
    
    createTodoElement(todo, index) {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''} ${todo.priority || ''}`;
        li.draggable = true;
        li.dataset.id = todo.id;

        // Format date
        const date = new Date(todo.createdAt);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Format reminder text if it exists
        let reminderHtml = '';
        if (todo.reminder) {
            const reminderDate = new Date(todo.reminder.date);
            const now = new Date();
            const isOverdue = reminderDate < now && !todo.completed;
            
            reminderHtml = `
                <span class="task-reminder ${isOverdue ? 'overdue' : ''}">
                    <i class="fas fa-bell"></i>
                    ${this.formatReminderDate(reminderDate, todo.reminder.repeat)}
                </span>
            `;
        }

        li.innerHTML = `
            <div class="todo-content">
                <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${this.escapeHtml(todo.text)}</span>
                ${reminderHtml}
                <div class="task-actions">
                    <button class="reminder-btn" aria-label="Set reminder">
                        <i class="far fa-bell"></i>
                    </button>
                    <button class="edit-btn" aria-label="Edit task">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" aria-label="Delete task">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="todo-meta">
                <span class="todo-date">${formattedDate}</span>
            </div>
        `;

        // Add event listeners
        const checkbox = li.querySelector('.todo-checkbox');
        const deleteBtn = li.querySelector('.delete-btn');
        const editBtn = li.querySelector('.edit-btn');
        const reminderBtn = li.querySelector('.reminder-btn');
        const todoText = li.querySelector('.todo-text');

        // Toggle complete
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            this.toggleTodoComplete(todo.id);
        });
        
        // Edit button click
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.editTodo(todo.id);
        });
        
        // Delete button click
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTodo(todo.id);
        });
        
        // Reminder button click
        if (reminderBtn) {
            reminderBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openReminderModal(todo.id);
            });
        }
        
        // Make the entire task clickable to toggle complete
        li.addEventListener('click', (e) => {
            // Only trigger if not clicking on interactive elements
            if (!e.target.closest('button, input, a')) {
                this.toggleTodoComplete(todo.id);
            }
        });

        return li;
    }
    
    setupDragAndDrop() {
        this.dom.todoList.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('todo-item')) {
                this.draggedItem = e.target;
                e.target.classList.add('dragging');
            }
        });
        
        this.dom.todoList.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(e.clientY);
            const currentItem = document.querySelector('.dragging');
            
            if (afterElement) {
                this.dom.todoList.insertBefore(currentItem, afterElement);
            } else {
                this.dom.todoList.appendChild(currentItem);
            }
        });
        
        this.dom.todoList.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('todo-item')) {
                e.target.classList.remove('dragging');
                this.updateTodoOrder();
            }
        });
    }
    
    getDragAfterElement(y) {
        const draggableElements = [...this.dom.todoList.querySelectorAll('.todo-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    updateTodoOrder() {
        const newOrder = [];
        const todoElements = this.dom.todoList.querySelectorAll('.todo-item');
        
        todoElements.forEach(element => {
            const id = element.dataset.id;
            const todo = this.todos.find(t => t.id === id);
            if (todo) newOrder.push(todo);
        });
        
        // Only update if order has changed
        const orderChanged = newOrder.some((todo, index) => 
            todo.id !== this.todos[index]?.id
        );
        
        if (orderChanged) {
            this.todos = newOrder;
            this.saveTodos();
            this.showToast('Task order updated');
        }
    }
    
    // Reminder functionality
    openReminderModal(todoId) {
        this.currentEditingId = todoId;
        const todo = this.todos.find(t => t.id === todoId);
        
        if (todo && todo.reminder) {
            const reminderDate = new Date(todo.reminder.date);
            this.dom.reminderDateInput.value = reminderDate.toISOString().split('T')[0];
            this.dom.reminderTimeInput.value = reminderDate.toTimeString().substring(0, 5);
            this.dom.reminderRepeatSelect.value = todo.reminder.repeat || 'none';
        } else {
            const now = new Date();
            this.dom.reminderDateInput.value = now.toISOString().split('T')[0];
            this.dom.reminderTimeInput.value = now.toTimeString().substring(0, 5);
            this.dom.reminderRepeatSelect.value = 'none';
        }
        
        this.dom.reminderModal.style.display = 'flex';
        setTimeout(() => {
            this.dom.reminderModal.style.opacity = '1';
        }, 10);
    }
    
    closeReminderModal() {
        this.dom.reminderModal.style.opacity = '0';
        setTimeout(() => {
            this.dom.reminderModal.style.display = 'none';
            this.currentEditingId = null;
        }, 300);
    }
    
    saveReminder() {
        if (!this.currentEditingId) return;
        
        const todo = this.todos.find(t => t.id === this.currentEditingId);
        if (!todo) return;
        
        const date = this.dom.reminderDateInput.value;
        const time = this.dom.reminderTimeInput.value;
        const repeat = this.dom.reminderRepeatSelect.value;
        
        if (!date || !time) {
            this.showToast('Please select both date and time', 'error');
            return;
        }
        
        // Combine date and time into a single datetime string
        const dateTimeString = `${date}T${time}:00`;
        const reminderDate = new Date(dateTimeString);
        
        if (isNaN(reminderDate.getTime())) {
            this.showToast('Invalid date or time', 'error');
            return;
        }
        
        // Save reminder to todo
        todo.reminder = {
            date: reminderDate.toISOString(),
            repeat: repeat === 'none' ? undefined : repeat
        };
        
        // Schedule the reminder notification
        this.scheduleReminderNotification(todo);
        
        // Save and update UI
        this.saveTodos();
        this.renderTodos();
        this.closeReminderModal();
        this.showToast('Reminder set successfully');
    }
    
    scheduleReminderNotification(todo) {
        if (!todo.reminder || todo.completed) return;
        
        const now = new Date();
        const reminderTime = new Date(todo.reminder.date);
        
        // Clear any existing timeouts for this todo
        if (todo.reminderTimeoutId) {
            clearTimeout(todo.reminderTimeoutId);
        }
        
        // If the reminder is in the future, schedule it
        if (reminderTime > now) {
            const timeout = reminderTime - now;
            todo.reminderTimeoutId = setTimeout(() => {
                this.showNotification(`Reminder: ${todo.text}`);
                
                // If it's a repeating reminder, schedule the next one
                if (todo.reminder?.repeat) {
                    this.scheduleNextRecurringReminder(todo);
                }
            }, timeout);
        } else if (todo.reminder?.repeat) {
            // If it's a past repeating reminder, schedule the next occurrence
            this.scheduleNextRecurringReminder(todo);
        }
    }
    
    scheduleNextRecurringReminder(todo) {
        if (!todo.reminder?.repeat) return;
        
        const now = new Date();
        let nextDate = new Date(todo.reminder.date);
        
        // Calculate next occurrence based on repeat type
        switch (todo.reminder.repeat) {
            case 'daily':
                nextDate.setDate(nextDate.getDate() + 1);
                break;
            case 'weekdays':
                do {
                    nextDate.setDate(nextDate.getDate() + 1);
                } while (nextDate.getDay() === 0 || nextDate.getDay() === 6);
                break;
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        
        // Update the reminder date and schedule it
        todo.reminder.date = nextDate.toISOString();
        this.scheduleReminderNotification(todo);
        this.saveTodos();
    }
    
    formatReminderDate(date, repeat) {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        
        const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = d.toLocaleDateString([], { 
            month: 'short', 
            day: 'numeric',
            year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
        
        if (!repeat) return `${timeStr}, ${dateStr}`;
        
        const repeatTexts = {
            'daily': 'Every day',
            'weekdays': 'Weekdays',
            'weekly': 'Weekly',
            'monthly': 'Monthly',
            'yearly': 'Yearly'
        };
        
        return `${timeStr}, ${repeatTexts[repeat] || ''}`;
    }
    
    async showNotification(message) {
        // Check if the browser supports notifications
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notifications');
            return;
        }
        
        // Check if notification permissions are already granted
        if (Notification.permission === 'granted') {
            // If it's okay, create a notification
            new Notification('To-Do Reminder', { body: message });
        } else if (Notification.permission !== 'denied') {
            // Otherwise, ask the user for permission
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    new Notification('To-Do Reminder', { body: message });
                }
            } catch (err) {
                console.error('Error requesting notification permission:', err);
            }
        }
        
        // Fallback to toast if notifications are blocked
        if (Notification.permission === 'denied') {
            this.showToast(message, 'info');
        }
    }
    
    // Theme functionality
    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 
                          (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        this.setTheme(savedTheme);
        this.dom.themeToggle.checked = savedTheme === 'dark';
    }
    
    toggleTheme() {
        const newTheme = this.dom.themeToggle.checked ? 'dark' : 'light';
        this.setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }
    
    // Utility functions
    showToast(message, type = 'success') {
        const toast = this.dom.toast;
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
    
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    getPriorityBadge(priority) {
        if (!priority) return '';
        
        const priorities = {
            low: { text: 'Low', class: 'priority-low' },
            medium: { text: 'Medium', class: 'priority-medium' },
            high: { text: 'High', class: 'priority-high' }
        };
        
        const p = priorities[priority.toLowerCase()];
        return p ? `<span class="priority-badge ${p.class}">${p.text}</span>` : '';
    }
}

// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    window.todoApp = new TodoApp();
});

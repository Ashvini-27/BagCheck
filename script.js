// DOM Elements
const form = document.getElementById('expense-form');
const textInput = document.getElementById('text');
const amountInput = document.getElementById('amount');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const list = document.getElementById('list');

const totalDisplay = document.getElementById('total-spent');
const balanceDisplay = document.getElementById('balance-left');
const budgetInput = document.getElementById('budget-input');
const budgetLabel = document.getElementById('budget-label');
const spentTitle = document.getElementById('spent-title');
const progressFill = document.getElementById('progress-fill');
const percentageText = document.getElementById('percentage-text');
const adviceBox = document.getElementById('advice-box');
const adviceText = document.getElementById('advice-text');
const bgOverlay = document.getElementById('dynamic-bg');
const viewSelect = document.getElementById('view-mode');

// --- STATE MANAGEMENT ---
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let budgets = JSON.parse(localStorage.getItem('budgets')) || { monthly: 0, weekly: 0 };
let currentView = 'monthly'; // 'monthly' or 'weekly'
let currentCategoryFilter = 'All';
let myChart = null;

// Init
init();

// --- EVENT LISTENERS ---
form.addEventListener('submit', addTransaction);

// --- CORE FUNCTIONS ---

function addTransaction(e) {
    e.preventDefault();
    if(textInput.value.trim() === '' || amountInput.value.trim() === '' || dateInput.value === '') return;

    const transaction = {
        id: generateID(),
        text: textInput.value,
        amount: +amountInput.value,
        category: categoryInput.value,
        date: dateInput.value
    };

    transactions.push(transaction);
    updateLocalStorage();
    init();
    
    textInput.value = '';
    amountInput.value = '';
}

function generateID() {
    return Math.floor(Math.random() * 100000000);
}

function removeTransaction(id) {
    transactions = transactions.filter(t => t.id !== id);
    updateLocalStorage();
    init();
}

function updateBudget() {
    // Save budget based on current view
    if (currentView === 'monthly') {
        budgets.monthly = +budgetInput.value;
    } else {
        budgets.weekly = +budgetInput.value;
    }
    localStorage.setItem('budgets', JSON.stringify(budgets));
    init();
}

// Switch between Monthly and Weekly view
function switchViewMode() {
    currentView = viewSelect.value;
    
    // Update UI Labels
    if (currentView === 'monthly') {
        budgetLabel.innerText = "Monthly Limit (₹)";
        spentTitle.innerText = "Spent This Month";
        budgetInput.value = budgets.monthly || '';
    } else {
        budgetLabel.innerText = "Weekly Limit (₹)";
        spentTitle.innerText = "Spent This Week";
        budgetInput.value = budgets.weekly || '';
    }
    
    init();
}

function filterList(category) {
    currentCategoryFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.innerText === category) btn.classList.add('active');
    });
    init();
}

// --- DATE HELPERS ---
function isThisMonth(dateString) {
    const d = new Date(dateString);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function isThisWeek(dateString) {
    const d = new Date(dateString);
    const now = new Date();
    
    // Calculate start of week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0,0,0,0);
    
    // Calculate end of week (Saturday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);

    return d >= startOfWeek && d <= endOfWeek;
}

// --- UI UPDATES ---

function init() {
    list.innerHTML = '';
    
    // 1. Filter by Date (Month vs Week)
    let timeFiltered = transactions.filter(t => {
        if (currentView === 'monthly') return isThisMonth(t.date);
        return isThisWeek(t.date);
    });

    // 2. Filter by Category (Tabs)
    let finalFiltered = timeFiltered;
    if (currentCategoryFilter !== 'All') {
        finalFiltered = timeFiltered.filter(t => t.category === currentCategoryFilter);
    }

    // 3. Render
    finalFiltered.forEach(addTransactionDOM);
    updateValues(timeFiltered); // Pass filtered data for calculations
    updateChart(timeFiltered);
}

function addTransactionDOM(transaction) {
    const icons = { 'Food': '🍔', 'Travel': '🚕', 'Bills': '⚡', 'Ent': '🎬', 'Other': '👻' };

    const item = document.createElement('li');
    item.onclick = () => { if(confirm('Delete this transaction?')) removeTransaction(transaction.id); };

    item.innerHTML = `
        <div class="li-left">
            <div class="category-icon">${icons[transaction.category] || '❓'}</div>
            <div>
                <strong>${transaction.text}</strong>
                <span class="li-date">${transaction.date}</span>
            </div>
        </div>
        <div class="li-right">
            <span class="li-amount">-${formatRupee(transaction.amount)}</span>
        </div>
    `;

    list.appendChild(item);
}

function updateValues(relevantTransactions) {
    const total = relevantTransactions.reduce((acc, item) => acc + item.amount, 0);
    const currentBudget = currentView === 'monthly' ? budgets.monthly : budgets.weekly;
    const remaining = currentBudget - total;

    totalDisplay.innerText = formatRupee(total);
    balanceDisplay.innerText = currentBudget > 0 ? formatRupee(remaining) : 'Set Budget';

    let percentage = 0;
    if (currentBudget > 0) percentage = (total / currentBudget) * 100;

    progressFill.style.width = `${Math.min(percentage, 100)}%`;
    percentageText.innerText = `${percentage.toFixed(1)}%`;

    updateDynamicVisuals(percentage, currentBudget);
}

function updateDynamicVisuals(percentage, budget) {
    adviceBox.className = 'card advice-card';
    
    if (budget === 0 || percentage < 50) {
        bgOverlay.style.background = 'var(--bg-safe)';
        adviceBox.classList.add(budget === 0 ? 'neutral' : 'good');
        adviceText.innerText = budget === 0 ? `Set a ${currentView} budget to start.` : "You're vibing. Spending is under control. 💰";
        progressFill.style.background = '#00b894';
    } 
    else if (percentage >= 50 && percentage < 85) {
        bgOverlay.style.background = 'var(--bg-warning)';
        adviceBox.classList.add('warning');
        adviceText.innerText = "Hol' up. You've crossed 50%. Watch your wallet. 👀";
        progressFill.style.background = '#fdcb6e';
    } 
    else {
        bgOverlay.style.background = 'var(--bg-danger)';
        adviceBox.classList.add('danger');
        adviceText.innerText = "YOU ARE COOKED. 🚨 Stop spending immediately!";
        progressFill.style.background = '#d63031';
    }
}

function updateChart(data) {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    const categories = {};
    data.forEach(t => { categories[t.category] = (categories[t.category] || 0) + t.amount; });

    const labels = Object.keys(categories);
    const values = Object.values(categories);

    if (myChart) myChart.destroy();

    myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: ['#ff7675', '#74b9ff', '#ffeaa7', '#a29bfe', '#dfe6e9'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } }
        }
    });
}

function exportCSV() {
    if(transactions.length === 0) { alert("No data to export!"); return; }
    let csvContent = "data:text/csv;charset=utf-8,ID,Description,Category,Amount,Date\n";
    transactions.forEach(t => { csvContent += `${t.id},${t.text},${t.category},${t.amount},${t.date}\n`; });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bagcheck_expenses.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatRupee(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function updateLocalStorage() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function clearAll() {
    if(confirm('Reset everything? This cannot be undone.')) {
        transactions = [];
        budgets = { monthly: 0, weekly: 0 }; // Reset budgets too
        localStorage.removeItem('transactions');
        localStorage.removeItem('budgets');
        init();
    }
}

// Initial setup to match default dropdown
switchViewMode();
if (!requireAuth()) {
    throw new Error('Not authenticated');
}

let currentDataset = null;
let currentData = [];
let currentFilter = {};
let currentPage = 0;
let pageSize = 50;
let chart = null;

document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = '/';
});

document.getElementById('datasetSelect').addEventListener('change', async (e) => {
    currentDataset = e.target.value;
    if (currentDataset) {
        document.getElementById('applyFilterBtn').disabled = false;
        await loadData();
        await loadFilterFields();
    } else {
        document.getElementById('applyFilterBtn').disabled = true;
        document.getElementById('exportBtn').disabled = true;
    }
});

document.getElementById('filterField').addEventListener('change', (e) => {
    const valueContainer = document.getElementById('filterValueContainer');
    valueContainer.style.display = e.target.value ? 'block' : 'none';
});

document.getElementById('applyFilterBtn').addEventListener('click', applyFilter);

document.getElementById('exportBtn').addEventListener('click', exportData);

async function loadDatasets() {
    try {
        const datasets = await api.get('/datasets');
        const select = document.getElementById('datasetSelect');
        
        if (datasets.length === 0) {
            select.innerHTML = '<option value="">No datasets available</option>';
            return;
        }
        
        select.innerHTML = '<option value="">Select a dataset...</option>' +
            datasets.map(ds => `<option value="${escapeHtml(ds.name)}">${escapeHtml(ds.name)}</option>`).join('');
    } catch (error) {
        toast.error('Failed to load datasets');
    }
}

async function loadFilterFields() {
    if (!currentData || currentData.length === 0) return;
    
    const fields = Object.keys(currentData[0]);
    const filterField = document.getElementById('filterField');
    
    filterField.innerHTML = '<option value="">No filter</option>' +
        fields.map(field => `<option value="${escapeHtml(field)}">${escapeHtml(field)}</option>`).join('');
    
    document.getElementById('filterContainer').style.display = 'block';
}

async function loadData() {
    const container = document.getElementById('resultsTable');
    
    container.innerHTML = `
        <div class="skeleton-table-row skeleton"></div>
        <div class="skeleton-table-row skeleton"></div>
        <div class="skeleton-table-row skeleton"></div>
    `;
    
    try {
        let endpoint = `/data/${currentDataset}`;
        const params = new URLSearchParams();
        
        if (currentFilter.field && currentFilter.value) {
            params.append('filter', `${currentFilter.field}=${currentFilter.value}`);
        }
        
        if (params.toString()) {
            endpoint += '?' + params.toString();
        }
        
        currentData = await api.get(endpoint);
        
        document.getElementById('exportBtn').disabled = currentData.length === 0;
        document.getElementById('recordCount').textContent = `${currentData.length} records`;
        
        renderTable();
        renderChart();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Unable to load data</p>
                <button class="btn btn-primary btn-sm" onclick="loadData()">Retry</button>
            </div>
        `;
    }
}

function renderTable() {
    const container = document.getElementById('resultsTable');
    
    if (currentData.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>No data found</p>
            </div>
        `;
        return;
    }
    
    const fields = Object.keys(currentData[0]);
    const start = currentPage * pageSize;
    const end = Math.min(start + pageSize, currentData.length);
    const pageData = currentData.slice(start, end);
    
    container.innerHTML = `
        <div style="overflow-x: auto;">
            <table>
                <thead>
                    <tr>
                        ${fields.map(field => `<th>${escapeHtml(field)}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${pageData.map(row => `
                        <tr>
                            ${fields.map(field => `<td>${escapeHtml(String(row[field] || ''))}</td>`).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
    
    const totalPages = Math.ceil(currentData.length / pageSize);
    if (totalPages > 1) {
        document.getElementById('pagination').style.display = 'block';
        document.getElementById('prevBtn').disabled = currentPage === 0;
        document.getElementById('nextBtn').disabled = currentPage >= totalPages - 1;
        document.getElementById('pageInfo').textContent = `Page ${currentPage + 1} of ${totalPages}`;
        
        document.getElementById('prevBtn').onclick = () => {
            currentPage--;
            renderTable();
        };
        
        document.getElementById('nextBtn').onclick = () => {
            currentPage++;
            renderTable();
        };
    } else {
        document.getElementById('pagination').style.display = 'none';
    }
}

function renderChart() {
    if (!currentData || currentData.length === 0) {
        document.getElementById('chartSection').style.display = 'none';
        return;
    }
    
    const fields = Object.keys(currentData[0]);
    const numericField = fields.find(f => !isNaN(parseFloat(currentData[0][f])));
    
    if (!numericField) {
        document.getElementById('chartSection').style.display = 'none';
        return;
    }
    
    document.getElementById('chartSection').style.display = 'block';
    
    if (chart) {
        chart.destroy();
    }
    
    const ctx = document.getElementById('dataChart').getContext('2d');
    
    const values = currentData.slice(0, 50).map(row => parseFloat(row[numericField]) || 0);
    const labels = currentData.slice(0, 50).map((row, i) => `Record ${i + 1}`);
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: numericField,
                data: values,
                borderColor: 'rgb(79, 70, 229)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function applyFilter() {
    const field = document.getElementById('filterField').value;
    const value = document.getElementById('filterValue').value.trim();
    
    if (field && value) {
        currentFilter = { field, value };
    } else {
        currentFilter = {};
    }
    
    currentPage = 0;
    loadData();
}

async function exportData() {
    const btn = document.getElementById('exportBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Exporting...';
    
    try {
        let endpoint = `/data/export?format=csv&dataset=${currentDataset}`;
        
        if (currentFilter.field && currentFilter.value) {
            endpoint += `&filter=${currentFilter.field}=${currentFilter.value}`;
        }
        
        const blob = await api.download(endpoint);
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentDataset}-${new Date().toISOString()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Data exported successfully');
    } catch (error) {
        toast.error('Export failed');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '📥 Export CSV';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

loadDatasets();

if (!requireAuth()) {
    throw new Error('Not authenticated');
}

const SOURCES_API_BASE = '/api/sources';

let currentSources = [];
let selectedFile = null;
let uploadedMetadata = null;
let statusPolling = null;

const sourceTypeSelect = document.getElementById('sourceType');
const dbConfigSection = document.getElementById('dbConfigSection');
const fileConfigSection = document.getElementById('fileConfigSection');
const dropzone = document.getElementById('fileDropzone');
const fileInput = document.getElementById('fileInput');
const fileNameLabel = document.getElementById('fileName');
const dbTestButton = document.getElementById('testDbConnection');
const dbTestResult = document.getElementById('dbTestResult');

setupEventListeners();
loadSources();

function setupEventListeners() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        clearToken();
        window.location.href = '/';
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.action-menu')) {
            closeAllActionMenus();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeAllActionMenus();
        }
    });

    document.getElementById('addSourceBtn').addEventListener('click', () => {
        document.getElementById('addSourceForm').reset();
        resetConfigSections();
        selectedFile = null;
        uploadedMetadata = null;
        fileNameLabel.textContent = '';
        dbTestResult.textContent = '';
        document.getElementById('addSourceModal').style.display = 'flex';
    });

    document.getElementById('refreshBtn').addEventListener('click', loadSources);

    document.getElementById('addSourceForm').addEventListener('submit', handleCreateSource);

    if (sourceTypeSelect) {
        sourceTypeSelect.addEventListener('change', handleTypeChange);
    }

    if (dropzone) {
        dropzone.addEventListener('click', () => fileInput && fileInput.click());
        dropzone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropzone.classList.add('dragging');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragging'));
        dropzone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropzone.classList.remove('dragging');
            const file = event.dataTransfer.files[0];
            if (file) {
                setSelectedFile(file);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                setSelectedFile(file);
            }
        });
    }

    if (dbTestButton) {
        dbTestButton.addEventListener('click', async () => {
            try {
                const config = buildDatabaseConfig();
                await api.post(`${SOURCES_API_BASE}/test-connection`, {
                    type: 'DB',
                    config
                });
                dbTestResult.textContent = 'Connection successful.';
                dbTestResult.style.color = 'var(--success-color)';
            } catch (error) {
                dbTestResult.textContent = error.message || 'Connection failed.';
                dbTestResult.style.color = 'var(--error-color)';
            }
        });
    }
}

function handleTypeChange(event) {
    const value = event.target.value;
    dbConfigSection.style.display = value === 'DB' ? 'block' : 'none';
    fileConfigSection.style.display = value === 'CSV' || value === 'JSON' ? 'block' : 'none';
}

function resetConfigSections() {
    dbConfigSection.style.display = 'none';
    fileConfigSection.style.display = 'none';
}

function setSelectedFile(file) {
    selectedFile = file;
    uploadedMetadata = null;
    if (fileNameLabel) {
        fileNameLabel.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
    }
}

async function handleCreateSource(event) {
    event.preventDefault();

    const name = document.getElementById('sourceName').value.trim();
    const type = document.getElementById('sourceType').value;
    const role = document.getElementById('sourceRole').value || 'SOURCE';
    const additionalConfigText = document.getElementById('additionalConfig').value.trim();

    if (!name) {
        toast.error('Source name is required');
        return;
    }
    if (!type) {
        toast.error('Source type is required');
        return;
    }

    let additionalConfig = {};
    if (additionalConfigText) {
        try {
            additionalConfig = JSON.parse(additionalConfigText);
        } catch (error) {
            toast.error('Invalid JSON in additional configuration');
            return;
        }
    }

    let config = {};
    try {
        if (type === 'DB') {
            config = buildDatabaseConfig();
        } else if (type === 'CSV' || type === 'JSON') {
            const fileConfig = await ensureFileUploaded(type, name);
            config = { ...fileConfig };
        }
    } catch (error) {
        toast.error(error.message || 'Invalid configuration');
        return;
    }

    config = { ...config, ...additionalConfig };

    const submitBtn = event.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner"></span> Creating...';

    try {
        await api.post(SOURCES_API_BASE, {
            name,
            type,
            role,
            config
        });
        toast.success('Source created successfully');
        closeAddSourceModal();
        loadSources();
    } catch (error) {
        toast.error(error.message || 'Failed to create source');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Source';
    }
}

function buildDatabaseConfig() {
    const host = document.getElementById('dbHost').value.trim();
    const port = document.getElementById('dbPort').value.trim();
    const database = document.getElementById('dbName').value.trim();
    const username = document.getElementById('dbUser').value.trim();
    const password = document.getElementById('dbPassword').value;

    if (!host || !database || !username || !password) {
        throw new Error('All database fields are required');
    }

    return {
        host,
        port,
        database,
        username,
        password
    };
}

async function ensureFileUploaded(type, name) {
    if (!selectedFile) {
        throw new Error('Please select a file to upload.');
    }
    if (uploadedMetadata && uploadedMetadata.originalFilename === selectedFile.name) {
        return uploadedMetadata.config || {};
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    const sourceKey = sanitizeForUpload(name || selectedFile.name);
    formData.append('sourceKey', `${sourceKey}-${Date.now()}`);
    if (type === 'CSV') {
        formData.append('delimiter', ',');
        formData.append('encoding', 'UTF-8');
    } else if (type === 'JSON') {
        formData.append('encoding', 'UTF-8');
    }

    const endpoint = type === 'JSON' ? '/api/upload/json' : '/api/upload/csv';
    const response = await api.postMultipart(endpoint, formData);
    uploadedMetadata = response;
    toast.success('File uploaded successfully');
    return response.config || {};
}

function sanitizeForUpload(value) {
    return (value || 'source')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 40);
}

function closeAddSourceModal() {
    document.getElementById('addSourceModal').style.display = 'none';
    document.getElementById('addSourceForm').reset();
    resetConfigSections();
    selectedFile = null;
    uploadedMetadata = null;
    if (fileNameLabel) {
        fileNameLabel.textContent = '';
    }
    if (dbTestResult) {
        dbTestResult.textContent = '';
    }
}

function closeStatusModal() {
    document.getElementById('statusModal').style.display = 'none';
    if (statusPolling) {
        clearInterval(statusPolling);
        statusPolling = null;
    }
}

async function loadSources() {
    const container = document.getElementById('sourcesTable');
    container.innerHTML = `
        <div class="skeleton-table-row skeleton"></div>
        <div class="skeleton-table-row skeleton"></div>
        <div class="skeleton-table-row skeleton"></div>
    `;

    try {
        currentSources = await api.get(`${SOURCES_API_BASE}?role=SOURCE`);
        renderSources();
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <p>Unable to load sources</p>
                <button class="btn btn-primary btn-sm" onclick="loadSources()">Retry</button>
            </div>
        `;
    }
}

function renderSources() {
    const container = document.getElementById('sourcesTable');

    if (!Array.isArray(currentSources) || currentSources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📁</div>
                <p>No sources configured yet</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${currentSources.map(renderSourceRow).join('')}
            </tbody>
        </table>
    `;
}

function renderSourceRow(source) {
    const encodedName = encodeURIComponent(source.name || '');
    return `
        <tr>
            <td><strong>${escapeHtml(source.name)}</strong></td>
            <td><span class="badge badge-info">${escapeHtml(source.type)}</span></td>
            <td>${getStatusBadge(source.status)}</td>
            <td>${formatLastSync(source)}</td>
            <td class="actions-cell">
                <div class="action-menu">
                    <button class="btn-icon" type="button" onclick="toggleActionMenu(event)">
                        <span aria-hidden="true">⋯</span>
                        <span class="sr-only">Open actions for ${escapeHtml(source.name)}</span>
                    </button>
                    <div class="action-dropdown">
                        <button class="action-item" type="button" onclick="viewStatus('${source.id}')">Status</button>
                        <button class="action-item" type="button" onclick="ingestSource('${source.id}')">Start</button>
                        <button class="action-item action-danger" type="button" onclick="deleteSource('${source.id}', '${encodedName}')">Delete</button>
                    </div>
                </div>
            </td>
        </tr>
    `;
}

function getStatusBadge(status) {
    if (!status) {
        return '<span class="badge badge-secondary">Unknown</span>';
    }
    const badges = {
        'ACTIVE': '<span class="badge badge-success">Active</span>',
        'PAUSED': '<span class="badge badge-warning">Paused</span>'
    };
    return badges[status] || `<span class="badge badge-secondary">${escapeHtml(status)}</span>`;
}

function formatLastSync(source) {
    if (!source || !source.updatedAt) {
        return '<span style="color: var(--text-secondary);">Never</span>';
    }
    try {
        const date = new Date(source.updatedAt);
        if (Number.isNaN(date.getTime())) {
            return '<span style="color: var(--text-secondary);">Never</span>';
        }
        return `<span style="color: var(--text-secondary);">${date.toLocaleString()}</span>`;
    } catch (error) {
        return '<span style="color: var(--text-secondary);">Never</span>';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

async function ingestSource(sourceId) {
    closeAllActionMenus();
    try {
        await api.post(`${SOURCES_API_BASE}/${sourceId}/refresh`);
        toast.success('Ingestion started');
        loadSources();
    } catch (error) {
        toast.error(error.message || 'Failed to start ingestion');
    }
}

async function viewStatus(sourceId) {
    closeAllActionMenus();
    document.getElementById('statusModal').style.display = 'flex';
    const statusContent = document.getElementById('statusContent');
    statusContent.innerHTML = `
        <div class="skeleton-text skeleton"></div>
        <div class="skeleton-text skeleton"></div>
        <div class="skeleton-text skeleton"></div>
    `;

    try {
        const runs = await api.get(`${SOURCES_API_BASE}/${sourceId}/runs`);
        if (!runs || runs.length === 0) {
            statusContent.innerHTML = '<div class="empty-state">No ingestion runs yet.</div>';
            return;
        }
        const latest = runs[0];
        const processed = latest.rowsStored ?? latest.rowsRead ?? 0;
        const endedAt = latest.endedAt ? new Date(latest.endedAt).toLocaleString() : 'In progress';
        statusContent.innerHTML = `
            <div><strong>Status:</strong> ${escapeHtml(latest.runStatus)}</div>
            <div><strong>Records Processed:</strong> ${processed}</div>
            <div><strong>Started:</strong> ${latest.startedAt ? new Date(latest.startedAt).toLocaleString() : 'N/A'}</div>
            <div><strong>Ended:</strong> ${endedAt}</div>
            ${latest.errorMessage ? `<div class="alert alert-error">${escapeHtml(latest.errorMessage)}</div>` : ''}
        `;
    } catch (error) {
        statusContent.innerHTML = '<div class="alert alert-error">Failed to load run status.</div>';
    }
}

async function deleteSource(sourceId, encodedName = '') {
    closeAllActionMenus();
    const sourceName = decodeURIComponent(encodedName || '');
    const label = sourceName ? `"${sourceName}"` : 'this source';
    const confirmed = window.confirm(`Are you sure you want to delete ${label}? This action cannot be undone.`);
    if (!confirmed) {
        return;
    }

    try {
        await api.delete(`${SOURCES_API_BASE}/${sourceId}`);
        toast.success('Source deleted');
        loadSources();
    } catch (error) {
        toast.error(error.message || 'Failed to delete source');
    }
}

function toggleActionMenu(event) {
    event.preventDefault();
    event.stopPropagation();
    const menu = event.currentTarget.closest('.action-menu');
    if (!menu) {
        return;
    }
    const isOpen = menu.classList.contains('open');
    closeAllActionMenus();
    if (!isOpen) {
        menu.classList.add('open');
    }
}

function closeAllActionMenus() {
    document.querySelectorAll('.action-menu.open').forEach(menu => menu.classList.remove('open'));
}

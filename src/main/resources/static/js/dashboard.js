if (!requireAuth()) {
    throw new Error('Not authenticated');
}

function decodeJWT(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error decoding JWT:', error);
        return null;
    }
}

const token = getToken();
if (token) {
    const decoded = decodeJWT(token);
    if (decoded && decoded.sub) {
        const welcomeMessage = document.getElementById('welcomeMessage');
        if (welcomeMessage) {
            welcomeMessage.textContent = `Welcome, ${decoded.sub}!`;
        }
    }
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    clearToken();
    window.location.href = '/';
});

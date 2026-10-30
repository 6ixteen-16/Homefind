/* Escapes text before it is placed into innerHTML or an HTML attribute.
   Use esc(value) around EVERY value that comes from the server or from a user. */
window.esc = function (value) {
    return String(value === null || value === undefined ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

/* Extract a readable error message from any API response body.
   Handles our own  {status:"error", message:"..."}  shape as well as
   FastAPI's built-in  {detail: "..." | [{msg:"..."},...]}  shape. */
window.apiErr = function (data, fallback) {
    if (!data) return fallback || 'An unknown error occurred.';
    if (typeof data.message === 'string' && data.message) return data.message;
    if (typeof data.detail === 'string' && data.detail) return data.detail;
    if (Array.isArray(data.detail) && data.detail.length) {
        return data.detail.map(function(e){ return e.msg || JSON.stringify(e); }).join('; ');
    }
    return fallback || 'An unknown error occurred.';
};


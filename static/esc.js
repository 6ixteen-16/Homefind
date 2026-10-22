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

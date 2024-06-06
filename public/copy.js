function addCopyButtons() {
    document.querySelectorAll('pre > code').forEach((codeBlock) => {
        if (!codeBlock.querySelector('.copy-code')) { // Check if button already exists
            console.log('Adding copy button to code block');
            const copyButton = document.createElement('button');
            copyButton.className = 'copy-code';
            copyButton.textContent = 'Copy';

            copyButton.addEventListener('click', () => {
                const code = codeBlock.innerText;
                navigator.clipboard.writeText(code).then(() => {
                    copyButton.textContent = 'Copied';
                    setTimeout(() => {
                        copyButton.textContent = 'Copy';
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            });

            const pre = codeBlock.parentNode;
            pre.style.position = 'relative';
            pre.appendChild(copyButton);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('Document fully loaded and parsed');
    addCopyButtons(); // Initial call to add copy buttons
});

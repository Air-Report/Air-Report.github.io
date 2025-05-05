function openModal(src) {
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    modalImage.src = src;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none';
}
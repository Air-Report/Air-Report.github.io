// overview.html 이미지 모달
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

// details.html Plotly 그래프 모달
function openGraphModal(graphId) {
    const modal = document.getElementById('graphModal');
    const modalImage = document.getElementById('modalGraphImage');
    const graphDiv = document.getElementById(graphId);
    
    Plotly.toImage(graphDiv, { format: 'png', width: 800, height: 600 }).then((imgData) => {
        modalImage.src = imgData;
        modal.style.display = 'flex';
    });
}

function closeGraphModal() {
    const modal = document.getElementById('graphModal');
    modal.style.display = 'none';
}
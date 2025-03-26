// 더미 데이터
const statsData = {
    "age": [
        {"name": "< 65", "percentage": "60", "icon": "fas fa-child", "color": "#333"},
        {"name": "≥ 65", "percentage": "40", "icon": "fas fa-user", "color": "#333"}
    ],
    "sex": [
        {"name": "Male", "percentage": "55", "icon": "fas fa-male", "color": "#1a73e8"},
        {"name": "Female", "percentage": "45", "icon": "fas fa-female", "color": "#e91e63"}
    ],
    "income": [
        {"name": "Medical aid", "percentage": "10", "icon": "fas fa-hand-holding-medical", "color": "#2ecc71"},
        {"name": "≤ 30th", "percentage": "20", "icon": "fas fa-coins", "color": "#2ecc71"},
        {"name": "31st - 70th", "percentage": "40", "icon": "fas fa-money-bill-wave", "color": "#2ecc71"},
        {"name": "> 70th", "percentage": "30", "icon": "fas fa-wallet", "color": "#2ecc71"}
    ],
    "smoking": [
        {"name": "Never", "percentage": "50", "icon": "fas fa-ban", "color": "#e74c3c"},
        {"name": "Past", "percentage": "20", "icon": "fas fa-history", "color": "#e74c3c"},
        {"name": "Current", "percentage": "25", "icon": "fas fa-smoking", "color": "#e74c3c"},
        {"name": "Unknown", "percentage": "5", "icon": "fas fa-question", "color": "#e74c3c"}
    ],
    "bmi": [
        {"name": "Underweight", "percentage": "10", "icon": "fas fa-weight", "color": "#f39c12"},
        {"name": "Normal", "percentage": "40", "icon": "fas fa-balance-scale", "color": "#f39c12"},
        {"name": "Overweight", "percentage": "30", "icon": "fas fa-weight", "color": "#f39c12"},
        {"name": "Obese", "percentage": "15", "icon": "fas fa-weight", "color": "#f39c12"},
        {"name": "Unknown", "percentage": "5", "icon": "fas fa-question", "color": "#f39c12"}
    ],
    "comorbidity": [
        {"name": "Hypertension", "percentage": "30", "icon": "fas fa-heartbeat", "color": "#9b59b6"},
        {"name": "Diabetes mellitus", "percentage": "20", "icon": "fas fa-syringe", "color": "#9b59b6"},
        {"name": "Dyslipidemia", "percentage": "25", "icon": "fas fa-tint", "color": "#9b59b6"},
        {"name": "Overall I code", "percentage": "25", "icon": "fas fa-diagnoses", "color": "#9b59b6"}
    ]
};

const populationData = {
    "total": "XXX,XXX",
    "percentage": "2.5"
};

// overview.html에서 호출
function applyFilter() {
    const gender = document.getElementById('gender').value;
    const ageGroup = document.getElementById('age_group').value;
    const condition = document.getElementById('condition').value;
    const exposure = document.getElementById('exposure').value;

    window.location.href = `details.html?gender=${gender}&age_group=${ageGroup}&condition=${condition}&exposure=${exposure}`;
}

// details.html에서 호출
function renderFilteredData() {
    const urlParams = new URLSearchParams(window.location.search);
    let gender = urlParams.get('gender');
    let ageGroup = urlParams.get('age_group');
    let condition = urlParams.get('condition');
    let exposure = urlParams.get('exposure');

    // 쿼리 파라미터가 없으면 기본값 설정
    if (!gender) gender = 'male';
    if (!ageGroup) ageGroup = '10s';
    if (!condition) condition = 'onset';
    if (!exposure) exposure = 'long';

    document.getElementById('total-population').textContent = populationData.total + '명';
    document.getElementById('percentage').textContent = '(' + populationData.percentage + '%)';

    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = '';

    for (const category in statsData) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'stats-category';

        const categoryTitle = document.createElement('h4');
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        categoryDiv.appendChild(categoryTitle);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'stats-items';

        statsData[category].forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'stats-item';

            const icon = document.createElement('i');
            icon.className = item.icon;
            icon.style.color = item.color;
            itemDiv.appendChild(icon);

            const name = document.createElement('p');
            name.textContent = item.name;
            itemDiv.appendChild(name);

            const percentage = document.createElement('p');
            percentage.className = 'percentage';
            percentage.textContent = item.percentage + '%';
            itemDiv.appendChild(percentage);

            itemsDiv.appendChild(itemDiv);
        });

        categoryDiv.appendChild(itemsDiv);
        statsContent.appendChild(categoryDiv);
    }
}

// details.html에서 그래프 토글
function toggleView(view) {
    const statsSection = document.querySelector('.content-sections');
    const graphSection = document.getElementById('graph-section');
    const statsButton = document.getElementById('show-stats');
    const graphButton = document.getElementById('show-graph');

    if (view === 'stats') {
        statsSection.style.display = 'flex';
        graphSection.style.display = 'none';
        statsButton.classList.add('active');
        graphButton.classList.remove('active');
    } else if (view === 'graph') {
        statsSection.style.display = 'none';
        graphSection.style.display = 'block';
        statsButton.classList.remove('active');
        graphButton.classList.add('active');
    }
}
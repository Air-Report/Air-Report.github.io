// 더미 데이터
const statsData = {
    "age": [
        {"name": "< 65", "percentage": "40.17", "icon": "fas fa-user", "color": "#333"}, // 40.17%
        {"name": "≥ 65", "percentage": "59.83", "icon": "fas fa-blind", "color": "#333"} // 59.83%
    ],
    "sex": [
        {"name": "Male", "percentage": "59.92", "icon": "fas fa-male", "color": "#1a73e8"}, // 59.92%
        {"name": "Female", "percentage": "40.08", "icon": "fas fa-female", "color": "#e91e63"} // 40.08%
    ],
    "income": [
        {"name": "Medical aid", "percentage": "9.8", "icon": "fas fa-coins", "color": "#2ecc71"}, // 9.8%
        {"name": "≤ 30th", "percentage": "19.94", "icon": "fas fa-coins", "color": "#2ecc71"}, // 19.94%
        {"name": "31st - 70th", "percentage": "29.08", "icon": "fas fa-coins", "color": "#2ecc71"}, // 29.08%
        {"name": "> 70th", "percentage": "39.51", "icon": "fas fa-coins", "color": "#2ecc71"} // 39.51%
    ],
    "smoking": [
        {"name": "Never", "percentage": "30.09", "icon": "fas fa-smoking", "color": "#e74c3c"}, // 30.09%
        {"name": "Past", "percentage": "10.17", "icon": "fas fa-smoking", "color": "#e74c3c"}, // 10.17%
        {"name": "Current", "percentage": "15.02", "icon": "fas fa-smoking", "color": "#e74c3c"}, // 15.02%
        {"name": "Unknown", "percentage": "44.72", "icon": "fas fa-smoking", "color": "#e74c3c"} // 44.72%
    ],
    "bmi": [
        {"name": "Underweight", "percentage": "1.7", "icon": "fas fa-weight", "color": "#f39c12"}, // 1.7%
        {"name": "Normal", "percentage": "17.01", "icon": "fas fa-balance-scale", "color": "#f39c12"}, // 17.01%
        {"name": "Overweight", "percentage": "14.51", "icon": "fas fa-weight", "color": "#f39c12"}, // 14.51%
        {"name": "Obese", "percentage": "22.79", "icon": "fas fa-weight", "color": "#f39c12"}, // 22.79%
        {"name": "Unknown", "percentage": "43.99", "icon": "fas fa-question", "color": "#f39c12"} // 43.99%
    ],
    "comorbidity": [
        {"name": "Hypertension", "percentage": "68.35", "icon": "fas fa-heartbeat", "color": "#9b59b6"}, // 68.35%
        {"name": "Diabetes mellitus", "percentage": "42.91", "icon": "fas fa-syringe", "color": "#9b59b6"}, // 42.91%
        {"name": "Dyslipidemia", "percentage": "62.40", "icon": "fas fa-tint", "color": "#9b59b6"}, // 62.40%
        {"name": "Overall I code", "percentage": "73.71", "icon": "fas fa-diagnoses", "color": "#9b59b6"} // 73.71%
    ]
};

const populationData = {
    "total": "288,898", // 288,898명으로 변경
    "percentage": "2.89" // 2.89%로 변경
};

// overview.html에서 호출
function applyFilter() {
    const department = document.getElementById('department').value;
    const disease = document.getElementById('disease').value;
    const condition = document.getElementById('condition').value;
    const exposure = document.getElementById('exposure').value;

    window.location.href = `details.html?department=${department}&disease=${disease}&condition=${condition}&exposure=${exposure}`;
}

// details.html에서 호출
function renderFilteredData() {
    const urlParams = new URLSearchParams(window.location.search);
    let department = urlParams.get('department');
    let disease = urlParams.get('disease');
    let condition = urlParams.get('condition');
    let exposure = urlParams.get('exposure');

    if (!department) department = '순환기';
    if (!disease) disease = 'cicr1';
    if (!condition) condition = '발생';
    if (!exposure) exposure = '단기';

    const filterTitle = document.getElementById('filter-title');
    if (filterTitle) {
        filterTitle.textContent = `${department.charAt(0).toUpperCase() + department.slice(1)}, ${disease}, ${condition.charAt(0).toUpperCase() + condition.slice(1)}, ${exposure.charAt(0).toUpperCase() + exposure.slice(1)}`;
    } else {
        console.error("Element with id 'filter-title' not found.");
    }

    document.getElementById('total-population').textContent = populationData.total.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '명';
    document.getElementById('percentage').textContent = '(' + populationData.percentage + '%)';

    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = '';

    for (const category in statsData) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'stats-category';

        const categoryTitle = document.createElement('h4');
        const titleWrapper = document.createElement('div');
        titleWrapper.style.display = 'flex';
        titleWrapper.style.alignItems = 'center';
        titleWrapper.style.justifyContent = 'center';
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        titleWrapper.appendChild(categoryTitle);

        if (category !== 'age' && category !== 'sex' && statsData[category].length > 0) {
            const icon = document.createElement('i');
            icon.className = statsData[category][0].icon;
            icon.style.color = statsData[category][0].color;
            icon.style.marginLeft = '10px';
            titleWrapper.appendChild(icon);
        }
        categoryDiv.appendChild(titleWrapper);

        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'stats-items';

        statsData[category].forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'stats-item';

            if (category === 'age' || category === 'sex') {
                const icon = document.createElement('i');
                icon.className = item.icon;
                icon.style.color = item.color;
                itemDiv.appendChild(icon);
            }

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

// table3 SVG 로드 및 툴팁 기능 추가
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 로드 완료');
  
    const svgObject = document.getElementById('graph-svg');
    if (svgObject) {
      console.log('graph-svg 요소 찾음');
  
      svgObject.addEventListener('load', () => {
        console.log('SVG 로드 완료');
        setupSvgTooltip(svgObject);
      });
  
      // SVG가 이미 로드된 경우 대비
      if (svgObject.contentDocument) {
        console.log('SVG 이미 로드됨');
        setupSvgTooltip(svgObject);
      }
    } else {
      console.error('graph-svg 요소를 찾을 수 없습니다.');
    }
  });
  
  function setupSvgTooltip(svgObject) {
    const svgDoc = svgObject.contentDocument;
    if (svgDoc) {
      console.log('SVG 문서 접근 성공');
      const svg = svgDoc.querySelector('svg');
      if (svg) {
        console.log('SVG 요소 찾음');
        svg.style.width = '100%';
        svg.style.height = 'auto';
  
        // 툴팁 요소 생성
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
  
        // <g> 태그에 툴팁 추가 (박스 툴팁만)
        const targetGroups = svg.querySelectorAll('g[id^="rect-"]');
        console.log('g[id^="rect-"] 개수:', targetGroups.length);
        targetGroups.forEach(group => {
          const path = group.querySelector('path');
          if (path) {
            console.log('박스 툴팁 추가:', group.id);
            path.addEventListener('mouseover', (e) => {
              const or = group.getAttribute('data-or');
              const ciLower = group.getAttribute('data-ci-lower');
              const ciUpper = group.getAttribute('data-ci-upper');
              tooltip.textContent = `OR: ${or}, CI: [${ciLower}, ${ciUpper}]`;
              tooltip.style.display = 'block';
              tooltip.style.left = `${e.pageX - 10}px`;
              tooltip.style.top = `${e.pageY + 180}px`;
            });
            path.addEventListener('mousemove', (e) => {
              tooltip.style.left = `${e.pageX - 10}px`;
              tooltip.style.top = `${e.pageY + 180}px`;
            });
            path.addEventListener('mouseout', () => {
              tooltip.style.display = 'none';
            });
          } else {
            console.warn('그룹 내 path 요소 없음:', group.id);
          }
        });
      } else {
        console.error('SVG 요소를 찾을 수 없습니다.');
      }
    } else {
      console.error('SVG 문서에 접근할 수 없습니다.');
    }
  }
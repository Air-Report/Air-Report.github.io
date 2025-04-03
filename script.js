// 더미 데이터
const statsData = {
    "연령": [
        {"name": "65세 미만", "percentage": "40.17", "icon": "fas fa-user", "color": "#333"}, // < 65
        {"name": "65세 이상", "percentage": "59.83", "icon": "fas fa-blind", "color": "#333"} // ≥ 65
    ],
    "성별": [
        {"name": "남성", "percentage": "59.92", "icon": "fas fa-male", "color": "#1a73e8"}, // 이미 한글
        {"name": "여성", "percentage": "40.08", "icon": "fas fa-female", "color": "#e91e63"} // 이미 한글
    ],
    "수익수준": [
        {"name": "의료급여", "percentage": "9.8", "icon": "fas fa-coins", "color": "#2ecc71"}, // Medical aid
        {"name": "< 30분위", "percentage": "19.94", "icon": "fas fa-coins", "color": "#2ecc71"}, // ≤ 30th
        {"name": "31-70 분위", "percentage": "29.08", "icon": "fas fa-coins", "color": "#2ecc71"}, // 31st - 70th
        {"name": "> 70분위", "percentage": "39.51", "icon": "fas fa-coins", "color": "#2ecc71"} // > 70th
    ],
    "흡연여부": [
        {"name": "비흡연자", "percentage": "30.09", "icon": "fas fa-smoking", "color": "#e74c3c"}, // 경험없음
        {"name": "과거 흡연자", "percentage": "10.17", "icon": "fas fa-smoking", "color": "#e74c3c"}, // 과거 흡현 (오타 수정)
        {"name": "현재 흡연자", "percentage": "15.02", "icon": "fas fa-smoking", "color": "#e74c3c"}, // 흡연자
        {"name": "알 수 없음", "percentage": "44.72", "icon": "fas fa-smoking", "color": "#e74c3c"} // 알수없음
    ],
    "bmi": [
        {"name": "저체중", "percentage": "1.7", "icon": "fas fa-weight", "color": "#f39c12"}, // 이미 한글
        {"name": "정상", "percentage": "17.01", "icon": "fas fa-balance-scale", "color": "#f39c12"}, // 정상체중
        {"name": "과체중", "percentage": "14.51", "icon": "fas fa-weight", "color": "#f39c12"}, // 이미 한글
        {"name": "비만", "percentage": "22.79", "icon": "fas fa-weight", "color": "#f39c12"}, // 이미 한글
        {"name": "알 수 없음", "percentage": "43.99", "icon": "fas fa-question", "color": "#f39c12"} // 알수없음
    ],
    "동반질환": [
        {"name": "고혈압", "percentage": "68.35", "icon": "fas fa-heartbeat", "color": "#9b59b6"}, // Hypertension
        {"name": "당뇨병", "percentage": "42.91", "icon": "fas fa-syringe", "color": "#9b59b6"}, // Diabetes mellitus
        {"name": "고지혈증", "percentage": "62.40", "icon": "fas fa-tint", "color": "#9b59b6"}, // Dyslipidemia
        {"name": "기타 심혈관질환", "percentage": "73.71", "icon": "fas fa-diagnoses", "color": "#9b59b6"} // Overall I code (의미 확인 필요)
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


// 필터 제목 업데이트 함수
function updateFilterTitle(view) {
    const filterTitle = document.getElementById('filter-title');
    const { department, disease, condition, exposure } = window.currentFilters || {};

    if (view === 'stats') {
        filterTitle.textContent = `인구사회학적 정보 (Table 1) & Main result & sensitivity analysis\n[분과: ${department}, 질환: ${disease}, 상태: ${condition}, 노출: ${exposure}]`;
    } else if (view === 'graph') {
        filterTitle.textContent = `하위 그룹 분석 결과\n[분과: ${department}, 질환: ${disease}, 상태: ${condition}, 노출: ${exposure}]`;
    }
}

// details.html에서 호출
function renderFilteredData() {
    // 1. URL 파라미터 파싱 및 기본값 설정
    const urlParams = new URLSearchParams(window.location.search);
    let department = urlParams.get('department') || '순환기';
    let disease = urlParams.get('disease') || 'cicr1';
    let condition = urlParams.get('condition') || '발생';
    let exposure = urlParams.get('exposure') || '단기';

    // 2. 필터 값을 전역 변수로 저장
    window.currentFilters = { department, disease, condition, exposure };

    // 3. 초기 로드 시 통계 섹션 제목 설정
    updateFilterTitle('stats');

    // 4. 인구 데이터 표시
    document.getElementById('total-population').textContent = populationData.total.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '명';
    document.getElementById('percentage').textContent = '(' + populationData.percentage + '%)';

    // 5. 통계 섹션 렌더링
    const statsContent = document.getElementById('stats-content');
    statsContent.innerHTML = ''; // 기존 내용 초기화

    for (const category in statsData) {
        // 카테고리 컨테이너 생성
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'stats-category';

        // 카테고리 제목 생성
        const categoryTitle = document.createElement('h4');
        const titleWrapper = document.createElement('div');
        titleWrapper.style.display = 'flex';
        titleWrapper.style.alignItems = 'center';
        titleWrapper.style.justifyContent = 'center';
        categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        titleWrapper.appendChild(categoryTitle);

        // 연령/성별 외 카테고리에 아이콘 추가
        if (category !== 'age' && category !== 'sex' && statsData[category].length > 0) {
            const icon = document.createElement('i');
            icon.className = statsData[category][0].icon;
            icon.style.color = statsData[category][0].color;
            icon.style.marginLeft = '10px';
            titleWrapper.appendChild(icon);
        }
        categoryDiv.appendChild(titleWrapper);

        // 항목 컨테이너 생성
        const itemsDiv = document.createElement('div');
        itemsDiv.className = 'stats-items';

        // 각 항목 렌더링
        statsData[category].forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'stats-item';

            // 연령/성별에만 아이콘 추가
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
        updateFilterTitle('stats'); // 통계 제목으로 업데이트
    } else if (view === 'graph') {
        statsSection.style.display = 'none';
        graphSection.style.display = 'block';
        statsButton.classList.remove('active');
        graphButton.classList.add('active');
        updateFilterTitle('graph'); // 그래프 제목으로 업데이트
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
              tooltip.style.left = `${e.pageX + 150}px`;
              tooltip.style.top = `${e.pageY + 180}px`;
            });
            path.addEventListener('mousemove', (e) => {
              tooltip.style.left = `${e.pageX + 150}px`;
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
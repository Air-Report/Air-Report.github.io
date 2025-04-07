// [추가] CSV 데이터를 로드하는 공통 함수
function loadCSVData(callback) {
    const files = [
        { path: '/data/data_short_worse.csv', exposure: '단기', condition: '악화' },
        { path: '/data/data_short_occur.csv', exposure: '단기', condition: '발생' }
    ];

    Promise.all(
        files.map(file =>
            fetch(file.path)
                .then(response => {
                    if (!response.ok) throw new Error(`CSV 파일 로드 실패: ${file.path}`);
                    return response.text();
                })
                .then(csvText => {
                    return new Promise((resolve) => {
                        Papa.parse(csvText, {
                            header: true,
                            skipEmptyLines: true,
                            complete: (result) => {
                                result.data.forEach(row => {
                                    row.exposure = file.exposure;
                                    row.condition = file.condition;
                                });
                                resolve(result.data);
                            },
                            error: (error) => console.error(`CSV 파싱 오류 (${file.path}):`, error)
                        });
                    });
                })
        )
    )
    .then(results => {
        window.csvData = [].concat(...results);
        console.log("모든 CSV 파싱 완료:", window.csvData);
        callback();
    })
    .catch(error => console.error("CSV 파일 가져오기 오류:", error));
}

// details.html 초기화 수정
if (window.location.pathname.includes('details.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        loadCSVData(() => {
            renderFilteredData();
        });
    });
}

// [이전] overview.html용 초기화 (단계 2)
document.addEventListener('DOMContentLoaded', () => {
    loadCSVData(() => {
        const departmentSelect = document.getElementById('department');
        const diseaseSelect = document.getElementById('disease');
        const exposureSelect = document.getElementById('exposure');
        const conditionSelect = document.getElementById('condition');

        // 분과-질환 매핑 함수
        function updateDiseaseMapping(exposure, condition) {
            const diseaseOptions = {};
            window.csvData.forEach(row => {
                if (row["exposure"] === exposure && row["condition"] === condition) {
                    const department = row["분과"];
                    const disease = row["질환명"];
                    if (department && disease) {
                        if (!diseaseOptions[department]) {
                            diseaseOptions[department] = new Set();
                        }
                        diseaseOptions[department].add(disease);
                    }
                }
            });
            for (const dept in diseaseOptions) {
                diseaseOptions[dept] = Array.from(diseaseOptions[dept]).map(disease => ({
                    value: disease,
                    text: disease
                }));
            }
            console.log(`분과-질환 매핑 (${exposure}, ${condition}):`, diseaseOptions);
            return diseaseOptions;
        }

        if (departmentSelect && diseaseSelect) {
            // 초기 매핑 및 업데이트
            let currentExposure = exposureSelect.value || "단기";
            let currentCondition = conditionSelect.value || "악화";
            let diseaseOptions = updateDiseaseMapping(currentExposure, currentCondition);
            updateDiseaseOptions(departmentSelect.value, diseaseOptions);

            // 분과 변경 시
            departmentSelect.addEventListener('change', () => {
                updateDiseaseOptions(departmentSelect.value, diseaseOptions);
            });

            // exposure 변경 시
            exposureSelect.addEventListener('change', () => {
                currentExposure = exposureSelect.value;
                diseaseOptions = updateDiseaseMapping(currentExposure, currentCondition);
                updateDiseaseOptions(departmentSelect.value, diseaseOptions);
            });

            // condition 변경 시
            conditionSelect.addEventListener('change', () => {
                currentCondition = conditionSelect.value;
                diseaseOptions = updateDiseaseMapping(currentExposure, currentCondition);
                updateDiseaseOptions(departmentSelect.value, diseaseOptions);
            });
        }

        // 테스트 출력
        console.log("테스트: 순환기 심근경색", getStatsData("순환기", "심근경색", exposureSelect.value, conditionSelect.value));
    });
});

// [이전] 질환 옵션 업데이트 함수 (단계 2)
function updateDiseaseOptions(department, diseaseOptions) {
    const diseaseSelect = document.getElementById('disease');
    diseaseSelect.innerHTML = '';
    const diseases = diseaseOptions[department] || [];
    diseases.forEach(disease => {
        const option = document.createElement('option');
        option.value = disease.value;
        option.textContent = disease.text;
        diseaseSelect.appendChild(option);
    });
}

// [이전] CSV 데이터에서 통계 추출 함수 (단계 3)
function getStatsData(department, disease, exposure, condition) {
    if (!window.csvData) {
        console.error("CSV 데이터가 로드되지 않았습니다.");
        return { statsData: {}, populationData: { total: "N/A", percentage: "N/A" } };
    }

    console.log("입력값:", { department, disease, exposure, condition }); // 디버깅용
    const filteredData = window.csvData.filter(row => {
        const match = row["분과"] === department && 
                      row["질환명"] === disease && 
                      row["exposure"] === exposure && 
                      row["condition"] === condition;
        return match;
    });
    console.log(`필터링된 데이터 (${department}, ${disease}, ${exposure}, ${condition}):`, filteredData);

    function getVariableData(variable) {
        const row = filteredData.find(row => row["변수명"] === variable && row["변수종류"] === "범주형");
        return {
            percentage: row && row["백분율(%)"] ? row["백분율(%)"] : "0",
            name: row && row["변수설명"] ? row["변수설명"] : variable
        };
    }

    const totalRow = filteredData.find(row => row["변수명"] === "age" && row["변수종류"] === "연속형");
    const totalPopulation = totalRow ? totalRow["대상자수"] : "N/A";
    const totalNum = parseInt(totalPopulation.replace(/,/g, '')) || 0;
    const percentage = ((totalNum / 10000000) * 100).toFixed(2);
    // statsData 생성
    const statsData = {
        "연령": [
            { "name": "65세 미만", "percentage": getVariableData("age650").percentage, "icon": "fas fa-user", "color": "#333" },
            { "name": "65세 이상", "percentage": getVariableData("age651").percentage, "icon": "fas fa-blind", "color": "#333" }
        ],
        "성별": [
            { "name": "남성", "percentage": getVariableData("sex1").percentage, "icon": "fas fa-male", "color": "#1a73e8" },
            { "name": "여성", "percentage": getVariableData("sex2").percentage, "icon": "fas fa-female", "color": "#e91e63" }
        ],
        "수익수준": [
            { "name": "의료급여", "percentage": getVariableData("income0").percentage },
            { "name": "30분위 미만", "percentage": getVariableData("income1").percentage },
            { "name": "31-70분위", "percentage": getVariableData("income2").percentage },
            { "name": "70분위 초과", "percentage": getVariableData("income3").percentage },
            { "name": "알 수 없음", "percentage": getVariableData("income9").percentage }
        ],
        "흡연여부": [
            { "name": "비흡연자", "percentage": getVariableData("smk1").percentage },
            { "name": "과거 흡연자", "percentage": getVariableData("smk2").percentage },
            { "name": "현재 흡연자", "percentage": getVariableData("smk3").percentage },
            { "name": "알 수 없음", "percentage": getVariableData("smk9").percentage }
        ],
        "bmi": [
            { "name": "저체중", "percentage": getVariableData("bmi_cat1").percentage },
            { "name": "정상", "percentage": getVariableData("bmi_cat2").percentage },
            { "name": "과체중", "percentage": getVariableData("bmi_cat3").percentage },
            { "name": "비만", "percentage": getVariableData("bmi_cat4").percentage },
            { "name": "알 수 없음", "percentage": getVariableData("bmi_cat9").percentage }
        ],
        "고혈압": [
            { "name": "1년 이내 고혈압 없음", "percentage": getVariableData("hyper0").percentage },
            { "name": "1년 이내 고혈압 있음", "percentage": getVariableData("hyper1").percentage }
        ],
        "당뇨병": [
            { "name": "1년 이내 당뇨병 없음", "percentage": getVariableData("dm0").percentage || getVariableData("DM0").percentage },
            { "name": "1년 이내 당뇨병 있음", "percentage": getVariableData("dm1").percentage || getVariableData("DM1").percentage }
        ],
        "고지혈증": [
            { "name": "1년 이내 고지혈증 없음", "percentage": getVariableData("dyslip0").percentage },
            { "name": "1년 이내 고지혈증 있음", "percentage": getVariableData("dyslip1").percentage }
        ],
        "심혈관질환": [
            { "name": "1년 이내 심혈관질환 없음", "percentage": getVariableData("icode0").percentage },
            { "name": "1년 이내 심혈관질환 있음", "percentage": getVariableData("icode1").percentage }
        ],
        "Charlson Comorbidity Index": [
            { "name": "CCI 점수 2 미만", "percentage": getVariableData("CCI<2").percentage },
            { "name": "CCI 점수 2 이상", "percentage": getVariableData("CCI>=2").percentage || getVariableData("CCI >=2").percentage }
        ],
        "심부전": [
            { "name": "1년 이내 심부전 없음", "percentage": getVariableData("HF0").percentage || getVariableData("hfail0").percentage },
            { "name": "1년 이내 심부전 있음", "percentage": getVariableData("HF1").percentage || getVariableData("hfail1").percentage }
        ],
        "협심증": [
            { "name": "1년 이내 협심증 없음", "percentage": getVariableData("angina0").percentage },
            { "name": "1년 이내 협심증 있음", "percentage": getVariableData("angina1").percentage }
        ],
        "심근경색": [
            { "name": "1년 이내 심근경색 없음", "percentage": getVariableData("MI0").percentage },
            { "name": "1년 이내 심근경색 있음", "percentage": getVariableData("MI1").percentage }
        ],
        "위식도역류질환": [
            { "name": "1년 이내 위식도역류질환 없음", "percentage": getVariableData("GERD0").percentage },
            { "name": "1년 이내 위식도역류질환 있음", "percentage": getVariableData("GERD1").percentage }
        ],
        "HIV": [
            { "name": "1년 이내 HIV 없음", "percentage": getVariableData("HIV0").percentage },
            { "name": "1년 이내 HIV 있음", "percentage": getVariableData("HIV1").percentage }
        ],
        "결핵": [
            { "name": "1년 이내 결핵 없음", "percentage": getVariableData("TB0").percentage },
            { "name": "1년 이내 결핵 있음", "percentage": getVariableData("TB1").percentage }
        ],
        "천식": [
            { "name": "1년 이내 천식 없음", "percentage": getVariableData("Asthma0").percentage || getVariableData("asthma0").percentage },
            { "name": "1년 이내 천식 있음", "percentage": getVariableData("Asthma1").percentage || getVariableData("asthma1").percentage }
        ],
        "폐렴": [
            { "name": "5년 이내 폐렴 없음", "percentage": getVariableData("Pneumo0").percentage },
            { "name": "5년 이내 폐렴 있음", "percentage": getVariableData("Pneumo1").percentage }
        ],
        "심방세동": [
            { "name": "1년 이내 심방세동 없음", "percentage": getVariableData("ventfib0").percentage },
            { "name": "1년 이내 심방세동 있음", "percentage": getVariableData("ventfib1").percentage }
        ],
        "뇌혈관질환": [
            { "name": "1년 이내 뇌혈관질환 없음", "percentage": getVariableData("cereb0").percentage },
            { "name": "1년 이내 뇌혈관질환 있음", "percentage": getVariableData("cereb1").percentage }
        ],
        "허혈성 심장질환": [
            { "name": "1년 이내 허혈성 심장질환 없음", "percentage": getVariableData("ische0").percentage },
            { "name": "1년 이내 허혈성 심장질환 있음", "percentage": getVariableData("ische1").percentage }
        ],
        "말초혈관질환": [
            { "name": "1년 이내 말초혈관질환 없음", "percentage": getVariableData("periph0").percentage },
            { "name": "1년 이내 말초혈관질환 있음", "percentage": getVariableData("periph1").percentage }
        ],
        "기관지확장증": [
            { "name": "1년 이내 기관지확장증 없음", "percentage": getVariableData("BE0").percentage },
            { "name": "1년 이내 기관지확장증 있음", "percentage": getVariableData("BE1").percentage }
        ],
        "결합조직질환 관련 폐질환": [
            { "name": "결합조직질환 관련 폐질환 없음", "percentage": getVariableData("CTD0").percentage },
            { "name": "결합조직질환 관련 폐질환 있음", "percentage": getVariableData("CTD1").percentage }
        ],
        "정신질환 F 코드": [
            { "name": "1년 이내 정신질환 F 코드 없음", "percentage": getVariableData("fcode0").percentage },
            { "name": "1년 이내 정신질환 F 코드 있음", "percentage": getVariableData("fcode1").percentage }
        ],
        "뇌졸중": [
            { "name": "1년 이내 뇌졸중 없음", "percentage": getVariableData("h_stroke0").percentage },
            { "name": "1년 이내 뇌졸중 있음", "percentage": getVariableData("h_stroke1").percentage }
        ],
        "허혈성 뇌졸중": [
            { "name": "1년 이내 허혈성 뇌졸중 없음", "percentage": getVariableData("h_ich0").percentage || getVariableData("ich0").percentage },
            { "name": "1년 이내 허혈성 뇌졸중 있음", "percentage": getVariableData("h_ich1").percentage || getVariableData("ich1").percentage }
        ],
        "출혈성 뇌졸중": [
            { "name": "1년 이내 출혈성 뇌졸중 없음", "percentage": getVariableData("h_hrr0").percentage || getVariableData("hrr0").percentage },
            { "name": "1년 이내 출혈성 뇌졸중 있음", "percentage": getVariableData("h_hrr1").percentage || getVariableData("hrr1").percentage }
        ],
        "자가면역질환": [
            { "name": "1년 이내 자가면역질환 없음", "percentage": getVariableData("autoimm0").percentage },
            { "name": "1년 이내 자가면역질환 있음", "percentage": getVariableData("autoimm1").percentage }
        ],
        "암": [
            { "name": "1년 이내 암 없음", "percentage": getVariableData("cancer0").percentage },
            { "name": "1년 이내 암 있음", "percentage": getVariableData("cancer1").percentage }
        ],
        "알레르기성 질환": [
            { "name": "1년 이내 알레르기성 질환 없음", "percentage": getVariableData("allergy0").percentage },
            { "name": "1년 이내 알레르기성 질환 있음", "percentage": getVariableData("allergy1").percentage }
        ],
        "건선관절염": [
            { "name": "1년 이내 건선관절염 없음", "percentage": getVariableData("psa0").percentage },
            { "name": "1년 이내 건선관절염 있음", "percentage": getVariableData("psa1").percentage }
        ],
        "호지킨림프종": [
            { "name": "1년 이내 호지킨림프종 없음", "percentage": getVariableData("hodg0").percentage },
            { "name": "1년 이내 호지킨림프종 있음", "percentage": getVariableData("hodg1").percentage }
        ],
        "비호지킨림프종": [
            { "name": "1년 이내 비호지킨림프종 없음", "percentage": getVariableData("nhodg0").percentage },
            { "name": "1년 이내 비호지킨림프종 있음", "percentage": getVariableData("nhodg1").percentage }
        ],
        "신세뇨관산증": [
            { "name": "1년 이내 신세뇨관산증 없음", "percentage": getVariableData("renal_tub0").percentage },
            { "name": "1년 이내 신세뇨관산증 있음", "percentage": getVariableData("renal_tub1").percentage }
        ],
        "간질환": [
            { "name": "1년 이내 간질환 없음", "percentage": getVariableData("liver0").percentage },
            { "name": "1년 이내 간질환 있음", "percentage": getVariableData("liver1").percentage }
        ],
        "만성 신질환": [
            { "name": "1년 이내 만성 신질환 없음", "percentage": getVariableData("chr_kid0").percentage },
            { "name": "1년 이내 만성 신질환 있음", "percentage": getVariableData("chr_kid1").percentage }
        ],
        "갑상선저하증": [
            { "name": "1년 이내 갑상선저하증 없음", "percentage": getVariableData("hypo_thy0").percentage },
            { "name": "1년 이내 갑상선저하증 있음", "percentage": getVariableData("hypo_thy1").percentage }
        ],
        "갑상선항진증": [
            { "name": "1년 이내 갑상선항진증 없음", "percentage": getVariableData("hyper_thy0").percentage },
            { "name": "1년 이내 갑상선항진증 있음", "percentage": getVariableData("hyper_thy1").percentage }
        ],
        "만성 폐쇄성 폐질환": [
            { "name": "1년 이내 만성 폐쇄성 폐질환 없음", "percentage": getVariableData("copd0").percentage || getVariableData("COPD0").percentage },
            { "name": "1년 이내 만성 폐쇄성 폐질환 있음", "percentage": getVariableData("copd1").percentage || getVariableData("COPD1").percentage }
        ],
        "아토피성 피부염": [
            { "name": "1년 이내 아토피성 피부염 없음", "percentage": getVariableData("atopi0").percentage },
            { "name": "1년 이내 아토피성 피부염 있음", "percentage": getVariableData("atopi1").percentage }
        ],
        "급성 신부전": [
            { "name": "급성 신부전 없음", "percentage": getVariableData("AKI0").percentage },
            { "name": "급성 신부전 있음", "percentage": getVariableData("AKI1").percentage }
        ],
        "만성 콩팥병": [
            { "name": "만성 콩팥병 없음", "percentage": getVariableData("CKD0").percentage },
            { "name": "만성 콩팥병 있음", "percentage": getVariableData("CKD1").percentage }
        ],
        "알츠하이머병": [
            { "name": "1년 이내 알츠하이머병 없음", "percentage": getVariableData("Altzh0").percentage },
            { "name": "1년 이내 알츠하이머병 있음", "percentage": getVariableData("Altzh1").percentage }
        ],
        "항혈소판제": [
            { "name": "항혈소판제 사용 없음", "percentage": getVariableData("Antiplatelet0").percentage },
            { "name": "항혈소판제 사용 있음", "percentage": getVariableData("Antiplatelet1").percentage }
        ],
        "항응고제": [
            { "name": "항응고제 사용 없음", "percentage": getVariableData("Anticoagulant0").percentage },
            { "name": "항응고제 사용 있음", "percentage": getVariableData("Anticoagulant1").percentage }
        ]
    };

    // 그룹별 아이콘 설정 (연령, 성별 제외)
    const groupIcons = {
        "수익수준": { icon: "fas fa-coins", color: "#2ecc71" },
        "흡연여부": { icon: "fas fa-smoking", color: "#e74c3c" },
        "bmi": { icon: "fas fa-weight", color: "#f39c12" },
        "고혈압": { icon: "fas fa-heartbeat", color: "#9b59b6" },
        "당뇨병": { icon: "fas fa-syringe", color: "#9b59b6" },
        "고지혈증": { icon: "fas fa-tint", color: "#9b59b6" },
        "심혈관질환": { icon: "fas fa-diagnoses", color: "#9b59b6" },
        "Charlson Comorbidity Index": { icon: "fas fa-chart-bar", color: "#9b59b6" },
        "심부전": { icon: "fas fa-heart", color: "#9b59b6" },
        "협심증": { icon: "fas fa-heartbeat", color: "#9b59b6" },
        "심근경색": { icon: "fas fa-heartbeat", color: "#9b59b6" },
        "위식도역류질환": { icon: "fas fa-stomach", color: "#9b59b6" },
        "HIV": { icon: "fas fa-virus", color: "#9b59b6" },
        "결핵": { icon: "fas fa-lungs", color: "#9b59b6" },
        "천식": { icon: "fas fa-lungs", color: "#9b59b6" },
        "폐렴": { icon: "fas fa-lungs", color: "#9b59b6" },
        "심방세동": { icon: "fas fa-heartbeat", color: "#9b59b6" },
        "뇌혈관질환": { icon: "fas fa-brain", color: "#9b59b6" },
        "허혈성 심장질환": { icon: "fas fa-heartbeat", color: "#9b59b6" },
        "말초혈관질환": { icon: "fas fa-veins", color: "#9b59b6" },
        "기관지확장증": { icon: "fas fa-lungs", color: "#9b59b6" },
        "결합조직질환 관련 폐질환": { icon: "fas fa-lungs", color: "#9b59b6" },
        "정신질환 F 코드": { icon: "fas fa-brain", color: "#9b59b6" },
        "뇌졸중": { icon: "fas fa-brain", color: "#9b59b6" },
        "허혈성 뇌졸중": { icon: "fas fa-brain", color: "#9b59b6" },
        "출혈성 뇌졸중": { icon: "fas fa-brain", color: "#9b59b6" },
        "자가면역질환": { icon: "fas fa-shield-virus", color: "#9b59b6" },
        "암": { icon: "fas fa-dna", color: "#9b59b6" },
        "알레르기성 질환": { icon: "fas fa-allergies", color: "#9b59b6" },
        "건선관절염": { icon: "fas fa-bone", color: "#9b59b6" },
        "호지킨림프종": { icon: "fas fa-dna", color: "#9b59b6" },
        "비호지킨림프종": { icon: "fas fa-dna", color: "#9b59b6" },
        "신세뇨관산증": { icon: "fas fa-kidneys", color: "#9b59b6" },
        "간질환": { icon: "fas fa-liver", color: "#9b59b6" },
        "만성 신질환": { icon: "fas fa-kidneys", color: "#9b59b6" },
        "갑상선저하증": { icon: "fas fa-thyroid", color: "#9b59b6" },
        "갑상선항진증": { icon: "fas fa-thyroid", color: "#9b59b6" },
        "만성 폐쇄성 폐질환": { icon: "fas fa-lungs", color: "#9b59b6" },
        "아토피성 피부염": { icon: "fas fa-skin", color: "#9b59b6" },
        "급성 신부전": { icon: "fas fa-kidneys", color: "#9b59b6" },
        "만성 콩팥병": { icon: "fas fa-kidneys", color: "#9b59b6" },
        "알츠하이머병": { icon: "fas fa-brain", color: "#9b59b6" },
        "항혈소판제": { icon: "fas fa-pills", color: "#9b59b6" },
        "항응고제": { icon: "fas fa-pills", color: "#9b59b6" }
    };

    for (const group in statsData) {
        const hasPercentage = statsData[group].some(item => item.percentage !== "0");
        if (!hasPercentage) {
            delete statsData[group];
        }
    }

    for (const group in statsData) {
        if (group !== "연령" && group !== "성별" && statsData[group].length > 0) {
            statsData[group].forEach(item => {
                item.icon = groupIcons[group]?.icon || "fas fa-question";
                item.color = groupIcons[group]?.color || "#9b59b6";
            });
        }
    }

    return {
        statsData,
        populationData: { total: totalPopulation, percentage: percentage }
    };
}

// [추가] details.html용 초기화 (단계 4)
// if (window.location.pathname.includes('details.html')) {
//     loadCSVData(() => {
//         renderFilteredData();
//     });
// }

// [수정] renderFilteredData 함수 (단계 4)
// function renderFilteredData() {
//     const urlParams = new URLSearchParams(window.location.search);
//     const department = urlParams.get('department') || '순환기';
//     const disease = urlParams.get('disease') || 'circ1';
//     const condition = urlParams.get('condition') || '악화';
//     const exposure = urlParams.get('exposure') || '단기';

//     window.currentFilters = { department, disease, condition, exposure };
//     updateFilterTitle('stats');

//     const { statsData, populationData } = getStatsData(department, disease, exposure, condition);

//     document.getElementById('total-population').textContent = populationData.total.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '명';
//     document.getElementById('percentage').textContent = '(' + populationData.percentage + '%)';

//     const statsContent = document.getElementById('stats-content');
//     statsContent.innerHTML = '';

//     for (const category in statsData) {
//         const categoryDiv = document.createElement('div');
//         categoryDiv.className = 'stats-category';

//         const categoryTitle = document.createElement('h4');
//         const titleWrapper = document.createElement('div');
//         titleWrapper.style.display = 'flex';
//         titleWrapper.style.alignItems = 'center';
//         titleWrapper.style.justifyContent = 'center';
//         categoryTitle.textContent = category.charAt(0).toUpperCase() + category.slice(1);
//         titleWrapper.appendChild(categoryTitle);

//         if (category !== '연령' && category !== '성별' && statsData[category].length > 0) {
//             const icon = document.createElement('i');
//             icon.className = statsData[category][0].icon;
//             icon.style.color = statsData[category][0].color;
//             icon.style.marginLeft = '10px';
//             titleWrapper.appendChild(icon);
//         }
//         categoryDiv.appendChild(titleWrapper);

//         const itemsDiv = document.createElement('div');
//         itemsDiv.className = 'stats-items';

//         statsData[category].forEach(item => {
//             const itemDiv = document.createElement('div');
//             itemDiv.className = 'stats-item';

//             if (category === '연령' || category === '성별') {
//                 const icon = document.createElement('i');
//                 icon.className = item.icon;
//                 icon.style.color = item.color;
//                 itemDiv.appendChild(icon);
//             }

//             const name = document.createElement('p');
//             name.textContent = item.name;
//             itemDiv.appendChild(name);

//             const percentage = document.createElement('p');
//             percentage.className = 'percentage';
//             percentage.textContent = item.percentage + '%';
//             itemDiv.appendChild(percentage);

//             itemsDiv.appendChild(itemDiv);
//         });

//         categoryDiv.appendChild(itemsDiv);
//         statsContent.appendChild(categoryDiv);
//     }
// }

function renderFilteredData() {
    const urlParams = new URLSearchParams(window.location.search);
    const department = urlParams.get('department') || '순환기';
    const disease = urlParams.get('disease') || 'circ1';
    const condition = urlParams.get('condition') || '악화';
    const exposure = urlParams.get('exposure') || '단기';

    window.currentFilters = { department, disease, condition, exposure };
    updateFilterTitle('stats');

    const { statsData, populationData } = getStatsData(department, disease, exposure, condition);

    document.getElementById('total-population').textContent = populationData.total.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '명';
    document.getElementById('percentage').textContent = '(' + populationData.percentage + '%)';

    // 코드명 -> 한글 매핑 객체
    const nameMapping = {
        "age650": "65세 미만",
        "age651": "65세 이상",
        "sex1": "남성",
        "sex2": "여성",
        "income1": "의료급여",
        "income2": "< 30분위",
        "income3": "31 - 70 분위",
        "income9": ">70 분위",
        "smk1": "비흡연자",
        "smk2": "과거 흡연자",
        "smk3": "현재 흡연자",
        "smk9": "알 수 없음",
        "bmi_cat1": "저체중",
        "bmi_cat2": "정상체중",
        "bmi_cat3": "과체중",
        "bmi_cat4": "비만",
        "bmi_cat9": "알 수 없음",
        "dyslip0": "1년 이내 이상지질혈증 발생 안함",
        "dyslip1": "1년 이내 이상지질혈증 발생",
        "icode0": "1년 이내 I 코드 전체 질환 발생 안함",
        "icode1": "1년 이내 I 코드 전체 질환 발생",
        "CCI<2": "동반질환 지수 <2",
        "CCI >=2": "동반질환 지수 ≥2",
        "HF0": "1년 이내 심부전 발생 안함",
        "HF1": "1년 이내 심부전 발생",
        "angina0": "1년 이내 협심증 발생 안함",
        "angina1": "1년 이내 협심증 발생",
        "MI0": "1년 이내 심근경색 발생 안함",
        "MI1": "1년 이내 심근경색 발생",
        "GERD0": "1년 이내 GERD 발생 안함",
        "GERD1": "1년 이내 GERD 발생",
        "HIV0": "1년 이내 HIV 발생 안함",
        "HIV1": "1년 이내 HIV 발생",
        "TB0": "발생일 이전 결핵 발생 안함",
        "TB1": "발생일 이전 결핵 발생",
        "Asthma0": "1년 이내 천식 발생 안함",
        "Asthma1": "1년 이내 천식 발생",
        "Pneumo0": "5년 이내 폐렴 발생 안함",
        "Pneumo1": "5년 이내 폐렴 발생",
        "ventfib0": "1년 이내 심방세동 발생 안함",
        "ventfib1": "1년 이내 심방세동 발생",
        "cereb0": "1년 이내 뇌혈관 질환 발생 안함",
        "cereb1": "1년 이내 뇌혈관 질환 발생",
        "hfail0": "1년 이내 심부전 발생 안함",
        "hfail1": "1년 이내 심부전 발생",
        "ische0": "1년 이내 허혈성 심장 질환 발생 안함",
        "ische1": "1년 이내 허혈성 심장 질환 발생",
        "periph0": "1년 이내 말초혈관 질환 발생 안함",
        "periph1": "1년 이내 말초혈관 질환 발생",
        "BE0": "1년 이내 기관지확장증 발생 안함",
        "BE1": "1년 이내 기관지확장증 발생",
        "CTD0": "결합조직 질환 관련 없는 간질성 폐질환",
        "CTD1": "결합조직 질환 관련 간질성 폐질환",
        "fcode0": "1년 이내 F code 발생 안함",
        "fcode1": "1년 이내 F code 발생",
        "h_stroke0": "1년 이내 뇌졸중 발생 안함",
        "h_stroke1": "1년 이내 뇌졸중 발생",
        "h_ich0": "1년 이내 허혈성 뇌졸중 발생 안함",
        "h_ich1": "1년 이내 허혈성 뇌졸중 발생",
        "h_hrr0": "1년 이내 출혈성 뇌조중 발생 안함",
        "h_hrr1": "1년 이내 출혈성 뇌졸중 발생",
        "autoimm0": "1년 이내 자가면역질환 발생 안함",
        "autoimm1": "1년 이내 자가면역질환 발생",
        "cancer0": "1년 이내 암 발생 안함",
        "cancer1": "1년 이내 암 발생",
        "allergy0": "1년 이내 알레르기성 질환 발생 안함",
        "allergy1": "1년 이내 알레르기성 질환 발생",
        "psa0": "1년 이내 건선관절염 발생 안함",
        "psa1": "1년 이내 건선관절염 발생",
        "hodg0": "1년 이내 호지킨림프종 발생 안함",
        "hodg1": "1년 이내 호지킨림프종 발생",
        "nhodg0": "1년 이내 비호지킨림프종 발생 안함",
        "nhodg1": "1년 이내 비호지킨림프종 발생",
        "renal_tub0": "1년 이내 신세뇨관산증 발생 안함",
        "renal_tub1": "1년 이내 신세뇨관산증 발생",
        "liver0": "1년 이내 간질환 발생 안함",
        "liver1": "1년 이내 간질환 발생",
        "chr_kid0": "1년 이내 만성 신질환 발생 안함",
        "chr_kid1": "1년 이내 만성 신질환 발생",
        "hypo_thy0": "1년 이내 갑상샘저하증 발생 안함",
        "hypo_thy1": "1년 이내 갑상샘저하증 발생",
        "hyper_thy0": "1년 이내 갑상샘항진증 발생 안함",
        "hyper_thy1": "1년 이내 갑상샘항진증 발생",
        "copd0": "1년 이내 만성 폐쇄성 폐질환 발생 안함",
        "copd1": "1년 이내 만성 폐쇄성 폐질환 발생",
        "hyper0": "1년 이내 고혈압 발생 안함",
        "hyper1": "1년 이내 고혈압 발생",
        "DM0": "1년 이내 당뇨 발생 안함",
        "DM1": "1년 이내 당뇨 발생",
        "asthma0": "1년 이내 천식 발생 안함",
        "asthma1": "1년 이내 천식 발생",
        "atopi0": "1년 이내 아토피성 피부염 발생 안함",
        "atopi1": "1년 이내 아토피성 피부염 발생",
        "AKI0": "신장질환 중 급성신부전 아님",
        "AKI1": "신장질환 중 급성신부전",
        "CKD0": "신장질환 중 만성콩팥병 아님",
        "CKD1": "신장질환 중 만성콩팥병",
        "Altzh0": "1년 이내 알츠하이머병 발생 안함",
        "Altzh1": "1년 이내 알츠하이머병 발생",
        "Antiplatelet0": "항혈소판제 사용 없음",
        "Antiplatelet1": "항혈소판제 사용 있음",
        "Anticoagulant0": "항응고제 사용 없음",
        "Anticoagulant1": "항응고제 사용 있음",
        "ich0": "뇌졸중 중 허혈성 뇌졸중 아님",
        "ich1": "뇌졸중 중 허혈성 뇌졸중",
        "hrr0": "뇌졸중 중 출혈성 뇌졸중 아님",
        "hrr1": "뇌족중 중 출혈성 뇌졸중"
    };

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

        if (category !== '연령' && category !== '성별' && statsData[category].length > 0) {
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

            if (category === '연령' || category === '성별') {
                const icon = document.createElement('i');
                icon.className = item.icon;
                icon.style.color = item.color;
                itemDiv.appendChild(icon);
            }

            const name = document.createElement('p');
            name.textContent = nameMapping[item.name] || item.name; // 매핑된 한글, 없으면 코드명
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



// [이전] 필터 제목 업데이트 함수
function updateFilterTitle(view) {
    const filterTitle = document.getElementById('filter-title');
    const { department, disease, condition, exposure } = window.currentFilters || {};

    if (view === 'stats') {
        filterTitle.textContent = `인구사회학적 정보 (Table 1) & Main result & sensitivity analysis\n[분과: ${department}, 질환: ${disease}, 상태: ${condition}, 노출: ${exposure}]`;
    } else if (view === 'graph') {
        filterTitle.textContent = `하위 그룹 분석 결과\n[분과: ${department}, 질환: ${disease}, 상태: ${condition}, 노출: ${exposure}]`;
    }
}

// [이전] applyFilter 함수
function applyFilter() {
    const department = document.getElementById('department').value;
    const disease = document.getElementById('disease').value;
    const condition = document.getElementById('condition').value;
    const exposure = document.getElementById('exposure').value;

    window.location.href = `details.html?department=${department}&disease=${disease}&condition=${condition}&exposure=${exposure}`;
}

// [이전] 그래프 토글 및 SVG 툴팁 함수 (기존 유지)
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
        updateFilterTitle('stats');
    } else if (view === 'graph') {
        statsSection.style.display = 'none';
        graphSection.style.display = 'block';
        statsButton.classList.remove('active');
        graphButton.classList.add('active');
        updateFilterTitle('graph');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const svgObject = document.getElementById('graph-svg');
    if (svgObject) {
        console.log('graph-svg 요소 찾음');
        svgObject.addEventListener('load', () => {
            console.log('SVG 로드 완료');
            setupSvgTooltip(svgObject);
        });
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

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);

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
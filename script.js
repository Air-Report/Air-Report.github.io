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
        "연령": [ // 변수별 아이콘 유지
            { "name": getVariableData("age650").name, "percentage": getVariableData("age650").percentage, "icon": "fas fa-user", "color": "#333" },
            { "name": getVariableData("age651").name, "percentage": getVariableData("age651").percentage, "icon": "fas fa-blind", "color": "#333" }
        ],
        "성별": [ // 변수별 아이콘 유지
            { "name": getVariableData("sex1").name, "percentage": getVariableData("sex1").percentage, "icon": "fas fa-male", "color": "#1a73e8" },
            { "name": getVariableData("sex2").name, "percentage": getVariableData("sex2").percentage, "icon": "fas fa-female", "color": "#e91e63" }
        ],
        "수익수준": [ // 그룹당 아이콘
            { "name": getVariableData("income0").name, "percentage": getVariableData("income0").percentage },
            { "name": getVariableData("income1").name, "percentage": getVariableData("income1").percentage },
            { "name": getVariableData("income2").name, "percentage": getVariableData("income2").percentage },
            { "name": getVariableData("income3").name, "percentage": getVariableData("income3").percentage },
            { "name": getVariableData("income9").name, "percentage": getVariableData("income9").percentage }
        ], // 백분율이 0인 항목 제외
        "흡연여부": [
            { "name": getVariableData("smk1").name, "percentage": getVariableData("smk1").percentage },
            { "name": getVariableData("smk2").name, "percentage": getVariableData("smk2").percentage },
            { "name": getVariableData("smk3").name, "percentage": getVariableData("smk3").percentage },
            { "name": getVariableData("smk9").name, "percentage": getVariableData("smk9").percentage }
        ],
        "bmi": [
            { "name": getVariableData("bmi_cat1").name, "percentage": getVariableData("bmi_cat1").percentage },
            { "name": getVariableData("bmi_cat2").name, "percentage": getVariableData("bmi_cat2").percentage },
            { "name": getVariableData("bmi_cat3").name, "percentage": getVariableData("bmi_cat3").percentage },
            { "name": getVariableData("bmi_cat4").name, "percentage": getVariableData("bmi_cat4").percentage },
            { "name": getVariableData("bmi_cat9").name, "percentage": getVariableData("bmi_cat9").percentage }
        ],
        "고혈압": [
            { "name": getVariableData("hyper0").name, "percentage": getVariableData("hyper0").percentage },
            { "name": getVariableData("hyper1").name, "percentage": getVariableData("hyper1").percentage }
        ],
        "당뇨병": [
            { "name": getVariableData("dm0").name || getVariableData("DM0").name, "percentage": getVariableData("dm0").percentage || getVariableData("DM0").percentage },
            { "name": getVariableData("dm1").name || getVariableData("DM1").name, "percentage": getVariableData("dm1").percentage || getVariableData("DM1").percentage }
        ],
        "고지혈증": [
            { "name": getVariableData("dyslip0").name, "percentage": getVariableData("dyslip0").percentage },
            { "name": getVariableData("dyslip1").name, "percentage": getVariableData("dyslip1").percentage }
        ],
        "심혈관질환": [
            { "name": getVariableData("icode0").name, "percentage": getVariableData("icode0").percentage },
            { "name": getVariableData("icode1").name, "percentage": getVariableData("icode1").percentage }
        ],
        "Charlson Comorbidity Index": [
            { "name": getVariableData("CCI<2").name, "percentage": getVariableData("CCI<2").percentage },
            { "name": getVariableData("CCI>=2").name || getVariableData("CCI >=2").name, "percentage": getVariableData("CCI>=2").percentage || getVariableData("CCI >=2").percentage }
        ],
        "심부전": [
            { "name": getVariableData("HF0").name || getVariableData("hfail0").name, "percentage": getVariableData("HF0").percentage || getVariableData("hfail0").percentage },
            { "name": getVariableData("HF1").name || getVariableData("hfail1").name, "percentage": getVariableData("HF1").percentage || getVariableData("hfail1").percentage }
        ],
        "협심증": [
            { "name": getVariableData("angina0").name, "percentage": getVariableData("angina0").percentage },
            { "name": getVariableData("angina1").name, "percentage": getVariableData("angina1").percentage }
        ],
        "심근경색": [
            { "name": getVariableData("MI0").name, "percentage": getVariableData("MI0").percentage },
            { "name": getVariableData("MI1").name, "percentage": getVariableData("MI1").percentage }
        ],
        "위식도역류질환": [
            { "name": getVariableData("GERD0").name, "percentage": getVariableData("GERD0").percentage },
            { "name": getVariableData("GERD1").name, "percentage": getVariableData("GERD1").percentage }
        ],
        "HIV": [
            { "name": getVariableData("HIV0").name, "percentage": getVariableData("HIV0").percentage },
            { "name": getVariableData("HIV1").name, "percentage": getVariableData("HIV1").percentage }
        ],
        "결핵": [
            { "name": getVariableData("TB0").name, "percentage": getVariableData("TB0").percentage },
            { "name": getVariableData("TB1").name, "percentage": getVariableData("TB1").percentage }
        ],
        "천식": [
            { "name": getVariableData("Asthma0").name || getVariableData("asthma0").name, "percentage": getVariableData("Asthma0").percentage || getVariableData("asthma0").percentage },
            { "name": getVariableData("Asthma1").name || getVariableData("asthma1").name, "percentage": getVariableData("Asthma1").percentage || getVariableData("asthma1").percentage }
        ],
        "폐렴": [
            { "name": getVariableData("Pneumo0").name, "percentage": getVariableData("Pneumo0").percentage },
            { "name": getVariableData("Pneumo1").name, "percentage": getVariableData("Pneumo1").percentage }
        ],
        "심방세동": [
            { "name": getVariableData("ventfib0").name, "percentage": getVariableData("ventfib0").percentage },
            { "name": getVariableData("ventfib1").name, "percentage": getVariableData("ventfib1").percentage }
        ],
        "뇌혈관질환": [
            { "name": getVariableData("cereb0").name, "percentage": getVariableData("cereb0").percentage },
            { "name": getVariableData("cereb1").name, "percentage": getVariableData("cereb1").percentage }
        ],
        "허혈성 심장질환": [
            { "name": getVariableData("ische0").name, "percentage": getVariableData("ische0").percentage },
            { "name": getVariableData("ische1").name, "percentage": getVariableData("ische1").percentage }
        ],
        "말초혈관질환": [
            { "name": getVariableData("periph0").name, "percentage": getVariableData("periph0").percentage },
            { "name": getVariableData("periph1").name, "percentage": getVariableData("periph1").percentage }
        ],
        "기관지확장증": [
            { "name": getVariableData("BE0").name, "percentage": getVariableData("BE0").percentage },
            { "name": getVariableData("BE1").name, "percentage": getVariableData("BE1").percentage }
        ],
        "결합조직질환 관련 폐질환": [
            { "name": getVariableData("CTD0").name, "percentage": getVariableData("CTD0").percentage },
            { "name": getVariableData("CTD1").name, "percentage": getVariableData("CTD1").percentage }
        ],
        "정신질환 F 코드": [
            { "name": getVariableData("fcode0").name, "percentage": getVariableData("fcode0").percentage },
            { "name": getVariableData("fcode1").name, "percentage": getVariableData("fcode1").percentage }
        ],
        "뇌졸중": [
            { "name": getVariableData("h_stroke0").name, "percentage": getVariableData("h_stroke0").percentage },
            { "name": getVariableData("h_stroke1").name, "percentage": getVariableData("h_stroke1").percentage }
        ],
        "허혈성 뇌졸중": [
            { "name": getVariableData("h_ich0").name || getVariableData("ich0").name, "percentage": getVariableData("h_ich0").percentage || getVariableData("ich0").percentage },
            { "name": getVariableData("h_ich1").name || getVariableData("ich1").name, "percentage": getVariableData("h_ich1").percentage || getVariableData("ich1").percentage }
        ],
        "출혈성 뇌졸중": [
            { "name": getVariableData("h_hrr0").name || getVariableData("hrr0").name, "percentage": getVariableData("h_hrr0").percentage || getVariableData("hrr0").percentage },
            { "name": getVariableData("h_hrr1").name || getVariableData("hrr1").name, "percentage": getVariableData("h_hrr1").percentage || getVariableData("hrr1").percentage }
        ],
        "자가면역질환": [
            { "name": getVariableData("autoimm0").name, "percentage": getVariableData("autoimm0").percentage },
            { "name": getVariableData("autoimm1").name, "percentage": getVariableData("autoimm1").percentage }
        ],
        "암": [
            { "name": getVariableData("cancer0").name, "percentage": getVariableData("cancer0").percentage },
            { "name": getVariableData("cancer1").name, "percentage": getVariableData("cancer1").percentage }
        ],
        "알레르기성 질환": [
            { "name": getVariableData("allergy0").name, "percentage": getVariableData("allergy0").percentage },
            { "name": getVariableData("allergy1").name, "percentage": getVariableData("allergy1").percentage }
        ],
        "건선관절염": [
            { "name": getVariableData("psa0").name, "percentage": getVariableData("psa0").percentage },
            { "name": getVariableData("psa1").name, "percentage": getVariableData("psa1").percentage }
        ],
        "호지킨림프종": [
            { "name": getVariableData("hodg0").name, "percentage": getVariableData("hodg0").percentage },
            { "name": getVariableData("hodg1").name, "percentage": getVariableData("hodg1").percentage }
        ],
        "비호지킨림프종": [
            { "name": getVariableData("nhodg0").name, "percentage": getVariableData("nhodg0").percentage },
            { "name": getVariableData("nhodg1").name, "percentage": getVariableData("nhodg1").percentage }
        ],
        "신세뇨관산증": [
            { "name": getVariableData("renal_tub0").name, "percentage": getVariableData("renal_tub0").percentage },
            { "name": getVariableData("renal_tub1").name, "percentage": getVariableData("renal_tub1").percentage }
        ],
        "간질환": [
            { "name": getVariableData("liver0").name, "percentage": getVariableData("liver0").percentage },
            { "name": getVariableData("liver1").name, "percentage": getVariableData("liver1").percentage }
        ],
        "만성 신질환": [
            { "name": getVariableData("chr_kid0").name, "percentage": getVariableData("chr_kid0").percentage },
            { "name": getVariableData("chr_kid1").name, "percentage": getVariableData("chr_kid1").percentage }
        ],
        "갑상선저하증": [
            { "name": getVariableData("hypo_thy0").name, "percentage": getVariableData("hypo_thy0").percentage },
            { "name": getVariableData("hypo_thy1").name, "percentage": getVariableData("hypo_thy1").percentage }
        ],
        "갑상선항진증": [
            { "name": getVariableData("hyper_thy0").name, "percentage": getVariableData("hyper_thy0").percentage },
            { "name": getVariableData("hyper_thy1").name, "percentage": getVariableData("hyper_thy1").percentage }
        ],
        "만성 폐쇄성 폐질환": [
            { "name": getVariableData("copd0").name || getVariableData("COPD0").name, "percentage": getVariableData("copd0").percentage || getVariableData("COPD0").percentage },
            { "name": getVariableData("copd1").name || getVariableData("COPD1").name, "percentage": getVariableData("copd1").percentage || getVariableData("COPD1").percentage }
        ],
        "아토피성 피부염": [
            { "name": getVariableData("atopi0").name, "percentage": getVariableData("atopi0").percentage },
            { "name": getVariableData("atopi1").name, "percentage": getVariableData("atopi1").percentage }
        ],
        "급성 신부전": [
            { "name": getVariableData("AKI0").name, "percentage": getVariableData("AKI0").percentage },
            { "name": getVariableData("AKI1").name, "percentage": getVariableData("AKI1").percentage }
        ],
        "만성 콩팥병": [
            { "name": getVariableData("CKD0").name, "percentage": getVariableData("CKD0").percentage },
            { "name": getVariableData("CKD1").name, "percentage": getVariableData("CKD1").percentage }
        ],
        "알츠하이머병": [
            { "name": getVariableData("Altzh0").name, "percentage": getVariableData("Altzh0").percentage },
            { "name": getVariableData("Altzh1").name, "percentage": getVariableData("Altzh1").percentage }
        ],
        "항혈소판제": [
            { "name": getVariableData("Antiplatelet0").name, "percentage": getVariableData("Antiplatelet0").percentage },
            { "name": getVariableData("Antiplatelet1").name, "percentage": getVariableData("Antiplatelet1").percentage }
        ],
        "항응고제": [
            { "name": getVariableData("Anticoagulant0").name, "percentage": getVariableData("Anticoagulant0").percentage },
            { "name": getVariableData("Anticoagulant1").name, "percentage": getVariableData("Anticoagulant1").percentage }
        ].filter(item => item.percentage !== "0")
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
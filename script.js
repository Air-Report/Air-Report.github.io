function loadCSVData(callback) {
    const files = {
        tb2: [
            { path: '/data/short_occur_tb2.csv', exposure: '단기', condition: '발생' },
            { path: '/data/short_worse_tb2.csv', exposure: '단기', condition: '악화' }
        ],
        tb3: [
            { path: '/data/short_occur_tb3.csv', exposure: '단기', condition: '발생' },
            { path: '/data/short_worse_tb3.csv', exposure: '단기', condition: '악화' }
        ],
        tb4: [
            { path: '/data/short_occur_tb4.csv', exposure: '단기', condition: '발생' },
            { path: '/data/short_worse_tb4.csv', exposure: '단기', condition: '악화' }
        ],
        stats: [
            { path: '/data/data_short_worse.csv', exposure: '단기', condition: '악화' },
            { path: '/data/data_short_occur.csv', exposure: '단기', condition: '발생' }
        ]
    };

    Promise.all(
        Object.entries(files).map(([key, fileList]) =>
            Promise.all(
                fileList.map(file =>
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
            ).then(results => {
                return { key, data: [].concat(...results) };
            })
        )
    )
    .then(results => {
        window.csvDataTb2 = results.find(r => r.key === 'tb2').data;
        window.csvDataTb3 = results.find(r => r.key === 'tb3').data;
        window.csvDataTb4 = results.find(r => r.key === 'tb4').data;
        window.csvDataStats = results.find(r => r.key === 'stats').data;

        // // console.log("CSV 파싱 완료 - tb2:", window.csvDataTb2);
        // // console.log("CSV 파싱 완료 - tb3:", window.csvDataTb3);
        // // console.log("CSV 파싱 완료 - tb4:", window.csvDataTb4);
        // // console.log("CSV 파싱 완료 - stats:", window.csvDataStats);

        callback();
    })
    .catch(error => console.error("CSV 파일 가져오기 오류:", error));
}

if (window.location.pathname.includes('details.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        loadCSVData(() => {
            renderFilteredData();

            const departmentSelect = document.getElementById('department');
            const diseaseSelect = document.getElementById('disease');
            const exposureSelect = document.getElementById('exposure');
            const conditionSelect = document.getElementById('condition');

            function updateSelectedStyles() {
                [departmentSelect, diseaseSelect, conditionSelect, exposureSelect].forEach(select => {
                    if (select.value) {
                        select.classList.add('selected');
                    } else {
                        select.classList.remove('selected');
                    }
                });
            }

            if (departmentSelect && exposureSelect && conditionSelect && diseaseSelect) {
                departmentSelect.addEventListener('change', () => {
                    const diseaseOptions = updateDiseaseMapping(exposureSelect.value, conditionSelect.value);
                    updateDiseaseOptions(departmentSelect.value, diseaseOptions);
                    updateSelectedStyles();
                });
                exposureSelect.addEventListener('change', () => {
                    const diseaseOptions = updateDiseaseMapping(exposureSelect.value, conditionSelect.value);
                    updateDiseaseOptions(departmentSelect.value, diseaseOptions);
                    updateSelectedStyles();
                });
                conditionSelect.addEventListener('change', () => {
                    const diseaseOptions = updateDiseaseMapping(exposureSelect.value, conditionSelect.value);
                    updateDiseaseOptions(departmentSelect.value, diseaseOptions);
                    updateSelectedStyles();
                });
                diseaseSelect.addEventListener('change', () => {
                    updateSelectedStyles();
                });
            }

            // SVG 툴팁 초기화
            ['graph-tb2-svg', 'graph-tb3-svg', 'graph-tb4-svg'].forEach(id => {
                const svgObject = document.getElementById(id);
                if (svgObject) {
                    svgObject.addEventListener('load', () => {
                        setupSvgTooltip(svgObject);
                    });
                    if (svgObject.contentDocument) {
                        setupSvgTooltip(svgObject);
                    }
                }
            });
        });
    });
}
// updateDiseaseOptions: 하드코딩된 매핑에서 질환 목록 생성
function updateDiseaseOptions(department, condition, exposure) {
    const diseaseSelect = document.getElementById('disease');
    if (!diseaseSelect) {
        // console.log("updateDiseaseOptions - diseaseSelect not available");
        return;
    }

    let diseases = [];
    if (exposure === "단기" && condition === "발생") {
        diseases = shortOccurMapping[department] || [];
    } else if (exposure === "단기" && condition === "악화") {
        diseases = shortWorseMapping[department] || [];
    } else {
        // 장기 노출의 경우 단기와 동일하게 설정
        diseases = condition === "발생" ? (shortOccurMapping[department] || []) : (shortWorseMapping[department] || []);
    }

    // console.log("updateDiseaseOptions - department:", department, "condition:", condition, "exposure:", exposure, "diseases:", diseases);

    diseaseSelect.innerHTML = '';
    diseases.forEach(disease => {
        const option = document.createElement('option');
        option.value = disease;
        option.textContent = disease;
        diseaseSelect.appendChild(option);
    });

    // URL 파라미터 또는 첫 번째 값으로 선택 설정
    const urlParams = new URLSearchParams(window.location.search);
    const disease = urlParams.get('disease') || diseases[0] || '';
    diseaseSelect.value = disease;
    // console.log("updateDiseaseOptions - selected disease:", diseaseSelect.value);

    if (diseaseSelect.value) diseaseSelect.classList.add('selected');
}


const shortOccurMapping = {
    "순환기": ["심근경색", "심방세동", "뇌혈관질환", "심부전", "허혈성심질환", "말초혈관질환", "병원밖심정지"],
    "호흡기": ["특발성폐섬유화증", "결핵", "만성폐쇄성폐질환", "천식", "기관지확장증", "비결핵성항상균감염", "알레르기 질환", "간질성폐질환"],
    "정신질환": ["우울증", "공황발작", "양극성장애", "자살", "자폐스펙트럼", "주의력결핍장애", "자해"],
    "신경계": ["혈관성치매", "편두통"],
    "피부": ["건선", "주사", "아토피성피부염"],
    "류마티스": ["쇼그렌증후군"],
    "이비인후": ["만성부비동염", "알레르기성비염"],
    // "신장": ["전체신장질환", "전체신장질환(급성신부전)", "전체신장질환(만성콩팥병)"],
    "신장": ["전체신장질환"],
    // "뇌졸중": ["뇌졸중(전체)", "허혈성뇌졸중", "출혈성뇌졸중"],
    "뇌졸중": ["뇌졸중(전체)"],
    "안과": ["망막동맥폐쇄", "망막정맥폐쇄", "비감염성전방포도막염", "비감염성비전방포도막염", "비감염성공막염", "안구건조증", "알레르기성결막염", "안검염", "백내장"]
};

// 단기 악화 매핑
const shortWorseMapping = {
    "순환기": ["심근경색", "심방세동", "뇌혈관질환", "심부전", "허혈성심질환"],
    "호흡기": ["특발성폐섬유화증", "만성폐쇄성폐질환", "천식", "기관지확장증", "간질성폐질환"],
    "정신질환": ["우울증", "공황발작", "양극성장애", "조현병", "자폐스펙트럼", "주의력결핍장애"],
    "신경계": ["치매", "알츠하이머", "파킨슨", "편두통"],
    "피부": ["건선", "아토피성피부염"],
    "류마티스": ["쇼그렌증후군"],
    "이비인후": ["알레르기성비염"],
    "신장": ["말기신부전", "신장이식", "전체신장질환"],
    // "뇌졸중": ["뇌졸중(전체)", "허혈성뇌졸중", "출혈성뇌졸중"],
    "뇌졸중": ["뇌졸중(전체)"],
    "안과": ["비감염성 전방 포도막염", "비감염성 비전방 포도막염", "비감염성 공막염"],
    "소화기": ["크론병", "궤양성대장염"],
    "내분비": ["2형당뇨병"]
};

// 분과 목록 정의 (setDepartmentOptions 위에 추가)
const departmentsForShortOccur = ["순환기", "호흡기", "정신질환", "신경계", "피부", "류마티스", "이비인후", "신장", "뇌졸중", "안과"];
const departmentsForShortWorse = ["순환기", "호흡기", "정신질환", "신경계", "피부", "류마티스", "이비인후", "신장", "뇌졸중", "안과", "소화기", "내분비"];



// setDepartmentOptions: 하드코딩된 분과 목록 설정
function setDepartmentOptions(condition, exposure) {
    const departmentSelect = document.getElementById('department');
    if (!departmentSelect) {
        // console.log("setDepartmentOptions - departmentSelect not available");
        return;
    }

    const departments = (exposure === "단기" && condition === "발생") ? departmentsForShortOccur : departmentsForShortWorse;

    // console.log("setDepartmentOptions - condition:", condition, "exposure:", exposure, "departments:", departments);

    departmentSelect.innerHTML = '';
    departments.forEach(dept => {
        const option = document.createElement('option');
        option.value = dept;
        option.textContent = dept;
        departmentSelect.appendChild(option);
    });

    const urlParams = new URLSearchParams(window.location.search);
    const department = urlParams.get('department') || departments[0];
    departmentSelect.value = department;
    // console.log("setDepartmentOptions - selected department:", departmentSelect.value);
}


document.addEventListener('DOMContentLoaded', () => {
    loadCSVData(() => {
        renderFilteredData(); // renderFilteredData 호출로 통합
    });
});


function updateCohortText(department, disease, exposure, condition) {
    const cohortText = document.getElementById('cohort-ver');
    // console.log("updateCohortText - cohortText:", cohortText);
    // console.log("pdateCohortText - department:", department, "disease:", disease, "exposure:", exposure, "condition:", condition);
    if (['자폐스펙트럼', '주의력결핍장애', '아토피성피부염'].includes(disease)) {
        cohortText.innerHTML = '*전 연령 대상 코호트 <br>(20세 미만)';
    } else if (['자해', '편두통'].includes(disease)) {
        cohortText.innerHTML = '*전 연령 대상 코호트 <br>(30세 미만)';
    } else {
        cohortText.innerHTML = '*30세 이상 연령 대상 코호트';
    }
}

function getStatsData(department, disease, exposure, condition) {
    if (!window.csvDataStats) {
        console.error("CSV 데이터가 로드되지 않았습니다.");
        return { statsData: {}, populationData: { total: "N/A", percentage: "N/A" } };
    }

    // console.log("입력값:", { department, disease, exposure, condition });
    const filteredData = window.csvDataStats.filter(row => {
        const match = row["분과"] === department && 
                      row["질환명"] === disease && 
                      row["exposure"] === exposure && 
                      row["condition"] === condition;
        return match;
    });
    // console.log(`필터링된 데이터 (${department}, ${disease}, ${exposure}, ${condition}):`, filteredData);

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
    const percentage = condition === '악화' ? (
        {
            '심근경색': 61.05,
            '심방세동': 32.55,
            '뇌혈관질환': 53.18,
            '심부전': 39.57,
            '허혈성심질환': 45.94,
            '특발성폐섬유화증': 76.36,
            '만성폐쇄성폐질환': 55.30,
            '천식': 39.74,
            '기관지확장증': 32.71,
            '간질성폐질환': 16.70,
            '우울증': 2.67,
            '공황발작': 0.37,
            '양극성장애': 5.21,
            '조현병': 10.23,
            '치매': 27.90,
            '알츠하이머': 49.05,
            '파킨슨': 15.01,
            '건선': 2.07,
            '쇼그렌증후군': 8.20,
            '알레르기성비염': 36.81,
            '말기신부전': 85.03,
            '신장이식': 87.14,
            '전체신장질환': 35.01,
            '뇌졸중 전체': 52.66,
            '비감염성 전방 포도막염': 15.59,
            '비감염성 비전방 포도막염': 13.67,
            '크론병': 39.31,
            '궤양성 대장염': 51.60,
            '2형당뇨병': 1.89,
            '자폐스펙트럼': 3.32,
            '주의력결핍장애': 0.76,
            '편두통': 42.57,
            '아토피성피부염': 2.64
        }[disease] || ((totalNum / 10000000) * 100).toFixed(2)
    ) : (
        ['자폐스펙트럼', '주의력결핍장애', '아토피성피부염', '자해', '편두통'].includes(disease) ?
        ((totalNum / 7400000) * 100).toFixed(2) :
        ((totalNum / 10000000) * 100).toFixed(2)
    );

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
        "체질량지수": [
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
            { "name": "1년 이내 천식 있음", "percentage": getVariableData("Asthma1").percentage || getVariableData("asthma0").percentage }
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

    const groupIcons = {
        "수익수준": { icon: "fas fa-coins", color: "#2ecc71" },
        "흡연여부": { icon: "fas fa-smoking", color: "#e74c3c" },
        "체질량지수": { icon: "fas fa-weight", color: "#f39c12" },
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

// Y축 위치 계산 및 라벨 생성
function calculateYPositions(groupDefs) {
    const yPos = [];
    const groupLabels = [];
    const subgroupLabels = [];
    let currentY = 0;
    const spacing = 2;
    const groupSpacing = 3;

    for (const [groupName, subItems] of Object.entries(groupDefs)) {
        const firstYInGroup = currentY;
        subItems.forEach(item => {
            subgroupLabels.push({ name: nameMapping[item] || item, y: currentY });
            yPos.push(currentY);
            currentY += spacing;
        });
        groupLabels.push({ name: groupName, y: firstYInGroup - 0.5 });
        currentY += groupSpacing;
    }
    // console.log("Y Positions:", yPos);
    // console.log("Group Labels:", groupLabels);
    // console.log("Subgroup Labels:", subgroupLabels);
    return { yPos, groupLabels, subgroupLabels };
}

function calculateYPositionsTb3(groupDefs) {
    const yPos = [];
    const groupLabels = [];
    const subgroupLabels = [];
    let currentY = 0;
    const spacing = 3;
    const groupSpacing = 3;

    for (const [groupName, subItems] of Object.entries(groupDefs)) {
        const firstYInGroup = currentY;
        subItems.forEach(item => {
            subgroupLabels.push({ name: nameMappingTb3[item] || item, y: currentY });
            yPos.push(currentY);
            currentY += spacing;
        });
        groupLabels.push({ name: groupName, y: firstYInGroup });
        currentY += groupSpacing;
    }

    // console.log("calculateYPositionsTb3 - yPos:", yPos);
    // console.log("calculateYPositionsTb3 - groupLabels:", groupLabels);
    // console.log("calculateYPositionsTb3 - subgroupLabels:", subgroupLabels);

    return { yPos, groupLabels, subgroupLabels };
}

// 포레스트 플롯 생성 함수
function createForestPlot(containerId, data, title) {
    const { yPos, groupLabels, subgroupLabels } = calculateYPositionsTb3(groupDefinitions);
    const plotData = Array.isArray(data) ? data[0] : data;
    const { oddsRatios, ciLowers, ciUppers, pValues } = plotData;
    // console.log("createForestPlot - oddsRatios:", oddsRatios);
    // console.log("createForestPlot - ciLowers:", ciLowers);
    // console.log("createForestPlot - ciUppers:", ciUppers);
    // console.log("createForestPlot - pValues:", pValues);

    // 유의미성 판단
    function isSignificant(lower, upper) {
        return !(lower <= 1 && upper >= 1);
    }

    // 데이터 길이 검증 및 기본값 채우기
    const adjustedOddsRatios = [];
    const adjustedCiLowers = [];
    const adjustedCiUppers = [];
    const adjustedTooltipText = [];
    yPos.forEach((_, i) => {
        if (i < oddsRatios.length && oddsRatios[i] !== undefined && !isNaN(oddsRatios[i])) {
            adjustedOddsRatios.push(oddsRatios[i]);
            adjustedCiLowers.push(ciLowers[i]);
            adjustedCiUppers.push(ciUppers[i]);
            const sig = isSignificant(ciLowers[i], ciUppers[i]);
            adjustedTooltipText.push(`OR: ${oddsRatios[i].toFixed(3)}${sig ? '*' : ''}<br>CI: [${ciLowers[i].toFixed(3)}, ${ciUppers[i].toFixed(3)}]`);
        } else {
            adjustedOddsRatios.push(1.0);
            adjustedCiLowers.push(1.0);
            adjustedCiUppers.push(1.0);
            adjustedTooltipText.push("No data");
        }
    });

    // 데이터 준비
    const traces = [
        // CI 바 (빨간색 사각형 형태)
        ...adjustedOddsRatios.map((or, i) => ({
            x: [adjustedCiLowers[i], adjustedCiUppers[i]],
            y: [yPos[i], yPos[i]],
            mode: 'lines',
            line: {
                color: 'red',
                width: 6
            },
            text: [adjustedTooltipText[i], adjustedTooltipText[i]],
            hoverinfo: 'text',
            hoverlabel: {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                font: { color: 'white' }
            },
            showlegend: false
        })),
        // OR 점
        {
            x: adjustedOddsRatios,
            y: yPos,
            mode: 'markers',
            marker: {
                size: 8,
                color: 'black',
                line: { width: 0.5, color: 'black' }
            },
            text: adjustedTooltipText,
            hoverinfo: 'text',
            showlegend: false
        }
    ];

    // Y축 범위 계산 (그룹 이름 포함)
    const yMin = Math.min(...yPos, ...groupLabels.map(g => g.y)) - 1;
    const yMax = Math.max(...yPos) + 1;

    // 레이아웃 설정
    const layout = {
        title: {
            text: title,
            x: 3.5,
            xanchor: 'left',
            pad: { t: 20 }
        },
        xaxis: {
            title: 'Odds Ratio',
            range: [
                Math.max(0.85, 1.00 - Math.max(Math.abs(Math.min(...adjustedCiLowers) - 1.00), Math.abs(Math.max(...adjustedCiUppers) - 1.00)) - 0.01),
                Math.min(1.1, 1.00 + Math.max(Math.abs(Math.min(...adjustedCiLowers) - 1.00), Math.abs(Math.max(...adjustedCiUppers) - 1.00)) + 0.01)
            ],
            tickvals: (() => {
                const minVal = Math.max(0.85, Math.min(...adjustedCiLowers));
                const maxVal = Math.min(1.1, Math.max(...adjustedCiUppers));
                if (maxVal - minVal < 0.04) {
                    return [0.98, 0.99, 1.00, 1.01, 1.02];
                }
                const step = (maxVal - minVal) / 4;
                return [minVal, minVal + step, minVal + 2 * step, minVal + 3 * step, maxVal].map(val => Math.round(val * 100) / 100);
            })(),
            ticktext: (() => {
                const minVal = Math.max(0.85, Math.min(...adjustedCiLowers));
                const maxVal = Math.min(1.1, Math.max(...adjustedCiUppers));
                if (maxVal - minVal < 0.04) {
                    return ['0.98', '0.99', '1.00', '1.01', '1.02'];
                }
                const step = (maxVal - minVal) / 4;
                return [minVal, minVal + step, minVal + 2 * step, minVal + 3 * step, maxVal].map(val => val.toFixed(2));
            })(),
            tickangle: 0,
            showgrid: false,
            zeroline: true,
            zerolinecolor: 'gray',
            zerolinewidth: 1,
            linecolor: 'black',
            linewidth: 1
        },
        yaxis: {
            range: [yMax, yMin],
            tickvals: yPos,
            ticktext: subgroupLabels.map(s => {
                let name = s.name;
                const maxLength = 20;
                if (name.includes('이내')) {
                    return name.replace('이내', '이내<br>');
                }
                if (name.length > maxLength) {
                    const words = name.split(' ');
                    let wrapped = '';
                    let currentLine = '';
                    words.forEach(word => {
                        if ((currentLine + word).length > maxLength) {
                            wrapped += (wrapped ? '<br>' : '') + currentLine;
                            currentLine = word + ' ';
                        } else {
                            currentLine += word + ' ';
                        }
                    });
                    wrapped += (wrapped ? '<br>' : '') + currentLine;
                    return wrapped.trim();
                }
                return name;
            }),
            showgrid: true,
            gridcolor: 'lightgray',
            gridwidth: 1,
            zeroline: false
        },
        shapes: [
            {
                type: 'line',
                x0: 1,
                x1: 1,
                y0: yMin,
                y1: yMax,
                line: { color: 'gray', width: 1, dash: 'dash' }
            }
        ],
        annotations: [
            ...groupLabels.map(g => ({
                x: -0.35,
                xref: 'paper',
                y: g.y - 1.0,
                text: g.name,
                xanchor: 'left',
                yanchor: 'bottom',
                showarrow: false,
                font: { size: 14, weight: 'bold' }
            })),
            ...pValues.map((item, idx) => ({
                x: 1.05,
                xref: 'paper',
                y: yPos[idx],
                text: item.pValue,
                xanchor: 'left',
                yanchor: 'middle',
                showarrow: false,
                font: { size: 10 }
            }))
        ],
        margin: { l: 200, r: 100, t: 80, b: 50 },
        height: Object.keys(groupDefinitions).length * 120,
        hovermode: 'closest',
        paper_bgcolor: '#f9f9f9',
        plot_bgcolor: '#f9f9f9'
    };

    Plotly.newPlot(containerId, traces, layout);
}

function renderFilteredData() {
    const urlParams = new URLSearchParams(window.location.search);
    const department = urlParams.get('department') || '순환기';
    const disease = urlParams.get('disease') || '심근경색';
    const condition = urlParams.get('condition') || '발생';
    const exposure = urlParams.get('exposure') || '단기';

    const departmentSelect = document.getElementById('department');
    const diseaseSelect = document.getElementById('disease');
    const conditionSelect = document.getElementById('condition');
    const exposureSelect = document.getElementById('exposure');

    // console.log("renderFilteredData - Initial values:", { department, disease, condition, exposure });

    if (conditionSelect && exposureSelect) {
        // 필터바 값 설정 (URL 파라미터 반영)
        conditionSelect.value = condition;
        exposureSelect.value = exposure;
        departmentSelect.value = department;
        diseaseSelect.value = disease;

        [conditionSelect, exposureSelect, departmentSelect, diseaseSelect].forEach(select => {
            if (select.value) select.classList.add('selected');
        });

        // condition 변경 시 department 및 질환 목록 업데이트
        conditionSelect.onchange = () => {
            // console.log("conditionSelect changed to:", conditionSelect.value);
            setDepartmentOptions(conditionSelect.value, exposureSelect.value);
            updateDiseaseOptions(departmentSelect.value, conditionSelect.value, exposureSelect.value);
        };

        // exposure 변경 시 department 및 질환 목록 업데이트
        exposureSelect.onchange = () => {
            // console.log("exposureSelect changed to:", exposureSelect.value);
            setDepartmentOptions(conditionSelect.value, exposureSelect.value);
            updateDiseaseOptions(departmentSelect.value, conditionSelect.value, exposureSelect.value);
        };

        // department 변경 시 질환 목록 업데이트
        departmentSelect.onchange = () => {
            // console.log("departmentSelect changed to:", departmentSelect.value);
            updateDiseaseOptions(departmentSelect.value, conditionSelect.value, exposureSelect.value);
        };

        // 초기 설정
        setDepartmentOptions(condition, exposure);
        updateDiseaseOptions(department, condition, exposure);
    }

    window.currentFilters = { department, disease, condition, exposure };

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
            name.textContent = nameMapping[item.name] || item.name;
            itemDiv.appendChild(name);

            const percentage = document.createElement('p');
            percentage.className = 'percentage';
            percentage.textContent = item.percentage + '%';
            itemDiv.appendChild(percentage);

            itemsDiv.appendChild(itemDiv);
        });

        categoryDiv.appendChild(itemsDiv);
        statsContent.appendChild(categoryDiv);
    };

        updateCohortText(department, disease, exposure, condition);
        const combinedDiseases = {
            '뇌졸중(전체)': ['뇌졸중(전체)', '허혈성뇌졸중', '출혈성뇌졸중'],
            '전체신장질환': ['전체신장질환', '전체신장질환(급성신부전)', '전체신장질환(만성콩팥병)'],
            '간질성폐질환': ['간질성폐질환', '간질성폐질환(CTD-related)', '간질성폐질환(CTD-unrelated)']
        };
        if (combinedDiseases[disease] && !(disease === '전체신장질환' && condition === '악화')) {
            renderForestPlotTb2Stroke(department, disease, exposure, condition, combinedDiseases[disease]);
        } else {
            renderForestPlotTb2(department, disease, exposure, condition);
        }
        renderForestPlot(department, disease, exposure, condition);
        renderForestPlotTb4(department, disease, exposure, condition);

    const statsSection = document.querySelector('.content-sections');
    const graphSection = document.getElementById('graph-section');
    statsSection.style.display = 'flex';
    graphSection.style.display = 'none';
}

// Plotly 그래프 렌더링 함수 (tb3용)
function renderForestPlot(department, disease, exposure, condition) {
    if (!window.csvDataTb3) {
        console.error("CSV 데이터가 로드되지 않았습니다.");
        return;
    }

    const filteredData = window.csvDataTb3.filter(row => row["분과"] === department && row["질환"] === disease && row["exposure"] === exposure && row["condition"] === condition);
    // console.log("renderForestPlot - filteredData:", filteredData); // filteredData 확인

    const availableSubgroups = [...new Set(filteredData.map(row => row["subgroup"]))];

    groupDefinitions = {};
    for (const group in groupMappingTb3) {
        const matchingSubgroups = groupMappingTb3[group].filter(subgroup => availableSubgroups.includes(subgroup));
        if (matchingSubgroups.length > 0) {
            groupDefinitions[group] = matchingSubgroups;
        }
    }
    // console.log("renderForestPlot - groupDefinitions:", groupDefinitions);
    const subgroupToGroup = {};
    for (const group in groupMappingTb3) {
        groupMappingTb3[group].forEach(subgroup => {
            subgroupToGroup[subgroup] = group;
        });
    }

    const orData = [];
    ['PM25', 'PM10'].forEach(air => {
        const airData = filteredData.filter(row => row["air"].toLowerCase() === air.toLowerCase());
        // console.log(`renderForestPlot - airData for ${air}:`, airData); // airData 확인

        const dataMap = {};
        airData.forEach(row => {
            const subgroup = row["subgroup"];
            dataMap[subgroup] = {
                OddsRatioEst: parseFloat(row["OddsRatioEst"]),
                LowerCL: parseFloat(row["LowerCL"]),
                UpperCL: parseFloat(row["UpperCL"]),
                pValue: row["p-value"] || ""
            };
        });
        // console.log(`renderForestPlot - dataMap for ${air}:`, dataMap); // dataMap 확인

        const oddsRatios = [];
        const ciLowers = [];
        const ciUppers = [];
        const pValues = [];
        for (const group in groupDefinitions) {
            groupDefinitions[group].forEach(subgroup => {
                if (dataMap[subgroup]) {
                    oddsRatios.push(dataMap[subgroup].OddsRatioEst);
                    ciLowers.push(dataMap[subgroup].LowerCL);
                    ciUppers.push(dataMap[subgroup].UpperCL);
                    pValues.push({ subgroup, pValue: dataMap[subgroup].pValue });
                } else {
                    oddsRatios.push(1.0);
                    ciLowers.push(1.0);
                    ciUppers.push(1.0);
                    pValues.push({ subgroup, pValue: "" });
                }
            });
        }
        orData.push({
            oddsRatios,
            ciLowers,
            ciUppers,
            pValues
        });
    });

    if (orData.length > 0) {
        createForestPlot('forest-plot-tb3-pm25', orData[0], "PM 2.5");
    }
    if (orData.length > 1) {
        createForestPlot('forest-plot-tb3-pm10', orData[1], "PM 10");
    }
}


function createForestPlotTb2(containerId, data, title) {
    // console.log("createForestPlotTb2 - data:", data);

    const yPos = [0];
    const groupLabels = [{ name: "Adjust", y: -0.5 }];
    const subgroupLabels = [{ name: "Adjust", y: 0 }];
    // console.log("createForestPlotTb2 - yPos:", yPos);

    const { oddsRatios, ciLowers, ciUppers, pValues } = data;

    function isSignificant(lower, upper) {
        return !(lower <= 1 && upper >= 1);
    }

    const adjustedOddsRatios = [];
    const adjustedCiLowers = [];
    const adjustedCiUppers = [];
    const adjustedTooltipText = [];
    yPos.forEach((_, i) => {
        if (i < oddsRatios.length && oddsRatios[i] !== undefined && !isNaN(oddsRatios[i])) {
            adjustedOddsRatios.push(oddsRatios[i]);
            adjustedCiLowers.push(ciLowers[i]);
            adjustedCiUppers.push(ciUppers[i]);
            const sig = isSignificant(ciLowers[i], ciUppers[i]);
            adjustedTooltipText.push(`OR: ${oddsRatios[i].toFixed(3)}${sig ? '*' : ''}<br>CI: [${ciLowers[i].toFixed(3)}, ${ciUppers[i].toFixed(3)}]`);
        } else {
            adjustedOddsRatios.push(1.0);
            adjustedCiLowers.push(1.0);
            adjustedCiUppers.push(1.0);
            adjustedTooltipText.push("No data");
        }
    });

    const traces = [
        ...adjustedOddsRatios.map((or, i) => ({
            x: [adjustedCiLowers[i], adjustedCiUppers[i]],
            y: [yPos[i], yPos[i]],
            mode: 'lines',
            line: {
                color: 'red',
                width: 8 // CI 바 높이 8로 설정
            },
            text: [adjustedTooltipText[i], adjustedTooltipText[i]],
            hoverinfo: 'text',
            hoverlabel: {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                font: { color: 'white' }
            },
            showlegend: false
        })),
        {
            x: adjustedOddsRatios,
            y: yPos,
            mode: 'markers',
            marker: {
                size: 8,
                color: 'black',
                line: { width: 0.5, color: 'black' }
            },
            text: adjustedTooltipText,
            hoverinfo: 'text',
            showlegend: false
        }
    ];

    const yMin = -1;
    const yMax = 1;

    const layout = {
        title: {
            text: title,
            x: 0.5, // 중앙으로 이동
            xanchor: 'center',
            pad: { t: 20 }
        },
        xaxis: {
            title: 'Odds Ratio',
            range: [
                Math.max(0.85, 1.00 - Math.max(Math.abs(Math.min(...adjustedCiLowers) - 1.00), Math.abs(Math.max(...adjustedCiUppers) - 1.00)) - 0.01),
                Math.min(1.15, 1.00 + Math.max(Math.abs(Math.min(...adjustedCiLowers) - 1.00), Math.abs(Math.max(...adjustedCiUppers) - 1.00)) + 0.01)
            ],
            tickvals: (() => {
                const minVal = Math.max(0.85, Math.min(...adjustedCiLowers));
                const maxVal = Math.min(1.15, Math.max(...adjustedCiUppers));
                if (maxVal - minVal < 0.04) {
                    return [0.98, 0.99, 1.00, 1.01, 1.02];
                }
                const step = (maxVal - minVal) / 4;
                return [minVal, minVal + step, minVal + 2 * step, minVal + 3 * step, maxVal].map(val => Math.round(val * 100) / 100);
            })(),
            ticktext: (() => {
                const minVal = Math.max(0.85, Math.min(...adjustedCiLowers));
                const maxVal = Math.min(1.15, Math.max(...adjustedCiUppers));
                if (maxVal - minVal < 0.04) {
                    return ['0.98', '0.99', '1.00', '1.01', '1.02'];
                }
                const step = (maxVal - minVal) / 4;
                return [minVal, minVal + step, minVal + 2 * step, minVal + 3 * step, maxVal].map(val => val.toFixed(2));
            })(),
            tickangle: 0,
            showgrid: false,
            zeroline: true,
            zerolinecolor: 'gray',
            zerolinewidth: 1,
            linecolor: 'black',
            linewidth: 1
        },
        yaxis: {
            range: [yMax, yMin],
            tickvals: yPos,
            ticktext: subgroupLabels.map(s => s.name),
            showgrid: true,
            gridcolor: 'lightgray',
            gridwidth: 1,
            zeroline: false
        },
        shapes: [
            {
                type: 'line',
                x0: 1,
                x1: 1,
                y0: yMin,
                y1: yMax,
                line: { color: 'gray', width: 1, dash: 'dash' }
            }
        ],
        annotations: [
            ...Object.entries(pValues).map(([groupName, pValue], idx) => ({
                x: 1.05,
                xref: 'paper',
                y: groupLabels.find(g => g.name === groupName).y + 0.5,
                text: pValue,
                xanchor: 'left',
                yanchor: 'bottom',
                showarrow: false,
                font: { size: 10 }
            }))
        ],
        margin: { l: 50, r: 50, t: 80, b: 50 },
        height: 300,
        hovermode: 'closest',
        paper_bgcolor: '#f9f9f9',
        plot_bgcolor: '#f9f9f9'
    };

    Plotly.newPlot(containerId, traces, layout);
}


function renderForestPlotTb2(department, disease, exposure, condition) {
    if (!window.csvDataTb2) {
        console.error("CSV 데이터(tb2)가 로드되지 않았습니다.");
        return;
    }

    const filteredData = window.csvDataTb2.filter(row => 
        row["분과"] === department && 
        row["질환"] === disease && 
        row["exposure"] === exposure && 
        row["condition"] === condition && 
        row["model"] === "adjust"
    );
    // console.log("renderForestPlotTb2 - filteredData:", filteredData);

    const orData = [];
    ['pm25', 'pm10'].forEach(air => {
        const airData = filteredData.filter(row => row["air"].toLowerCase() === air.toLowerCase());
        // console.log(`renderForestPlotTb2 - airData for ${air}:`, airData);

        if (airData.length === 0) {
            console.warn(`No data for ${air} in tb2`);
            orData.push({
                oddsRatios: [1.0],
                ciLowers: [1.0],
                ciUppers: [1.0],
                pValues: { "Adjust": "" }
            });
            return;
        }

        const row = airData[0];
        const oddsRatios = [parseFloat(row["OddsRatioEst"]) || 1.0];
        const ciLowers = [parseFloat(row["LowerCL"]) || 1.0];
        const ciUppers = [parseFloat(row["UpperCL"]) || 1.0];
        const pValues = { "Adjust": row["p-value"] || "" };

        orData.push({
            oddsRatios,
            ciLowers,
            ciUppers,
            pValues
        });
    });

    if (orData.length > 0) {
        createForestPlotTb2('forest-plot-tb2-pm25', orData[0], "PM 2.5");
    }
    if (orData.length > 1) {
        createForestPlotTb2('forest-plot-tb2-pm10', orData[1], "PM 10");
    }
}

function createForestPlotTb4(containerId, data, title) {
    // console.log("createForestPlotTb4 - data:", data);

    const yPos = [];
    const groupLabels = [];
    const subgroupLabels = [];
    let currentY = 0;
    const spacing = 2;
    const groupSpacing = 3;

    const groupDefs = groupDefinitions;
    // console.log("createForestPlotTb4 - groupDefs:", groupDefs);

    for (const [groupName, subItems] of Object.entries(groupDefs)) {
        const firstYInGroup = currentY;
        subItems.forEach(item => {
            subgroupLabels.push({ name: item, y: currentY }); // Days 값을 Y축 라벨로 사용
            yPos.push(currentY);
            currentY += spacing;
        });
        groupLabels.push({ name: groupName, y: firstYInGroup - 0.5 });
        currentY += groupSpacing;
    }
    // console.log("Y Positions:", yPos);
    // console.log("Group Labels:", groupLabels);
    // console.log("Subgroup Labels:", subgroupLabels);

    const { oddsRatios, ciLowers, ciUppers, pValues } = data;

    function isSignificant(lower, upper) {
        return !(lower <= 1 && upper >= 1);
    }

    const adjustedOddsRatios = [];
    const adjustedCiLowers = [];
    const adjustedCiUppers = [];
    const adjustedTooltipText = [];
    yPos.forEach((_, i) => {
        if (i < oddsRatios.length && oddsRatios[i] !== undefined && !isNaN(oddsRatios[i])) {
            adjustedOddsRatios.push(oddsRatios[i]);
            adjustedCiLowers.push(ciLowers[i]);
            adjustedCiUppers.push(ciUppers[i]);
            const sig = isSignificant(ciLowers[i], ciUppers[i]);
            adjustedTooltipText.push(`OR: ${oddsRatios[i].toFixed(3)}${sig ? '*' : ''}<br>CI: [${ciLowers[i].toFixed(3)}, ${ciUppers[i].toFixed(3)}]`);
        } else {
            adjustedOddsRatios.push(1.0);
            adjustedCiLowers.push(1.0);
            adjustedCiUppers.push(1.0);
            adjustedTooltipText.push("No data");
        }
    });

    const traces = [
        ...adjustedOddsRatios.map((or, i) => ({
            x: [adjustedCiLowers[i], adjustedCiUppers[i]],
            y: [yPos[i], yPos[i]],
            mode: 'lines',
            line: {
                color: 'red',
                width: 8 // CI 바 높이 8로 설정
            },
            text: [adjustedTooltipText[i], adjustedTooltipText[i]],
            hoverinfo: 'text',
            hoverlabel: {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                font: { color: 'white' }
            },
            showlegend: false
        })),
        {
            x: adjustedOddsRatios,
            y: yPos,
            mode: 'markers',
            marker: {
                size: 8,
                color: 'black',
                line: { width: 0.5, color: 'black' }
            },
            text: adjustedTooltipText,
            hoverinfo: 'text',
            showlegend: false
        }
    ];

    const yMin = Math.min(...yPos, ...groupLabels.map(g => g.y)) - 1;
    const yMax = Math.max(...yPos) + 1;

    const layout = {
        xaxis: {
            title: 'Odds Ratio',
            range: [
                Math.max(0.85, 1.00 - Math.max(Math.abs(Math.min(...adjustedCiLowers) - 1.00), Math.abs(Math.max(...adjustedCiUppers) - 1.00)) - 0.01),
                Math.min(1.15, 1.00 + Math.max(Math.abs(Math.min(...adjustedCiLowers) - 1.00), Math.abs(Math.max(...adjustedCiUppers) - 1.00)) + 0.01)
            ],
            tickvals: (() => {
                const minVal = Math.max(0.85, Math.min(...adjustedCiLowers));
                const maxVal = Math.min(1.15, Math.max(...adjustedCiUppers));
                if (maxVal - minVal < 0.04) {
                    return [0.98, 0.99, 1.00, 1.01, 1.02];
                }
                const step = (maxVal - minVal) / 4;
                return [minVal, minVal + step, minVal + 2 * step, minVal + 3 * step, maxVal].map(val => Math.round(val * 100) / 100);
            })(),
            ticktext: (() => {
                const minVal = Math.max(0.85, Math.min(...adjustedCiLowers));
                const maxVal = Math.min(1.15, Math.max(...adjustedCiUppers));
                if (maxVal - minVal < 0.04) {
                    return ['0.98', '0.99', '1.00', '1.01', '1.02'];
                }
                const step = (maxVal - minVal) / 4;
                return [minVal, minVal + step, minVal + 2 * step, minVal + 3 * step, maxVal].map(val => val.toFixed(2));
            })(),
            tickangle: 0,
            showgrid: false,
            zeroline: true,
            zerolinecolor: 'gray',
            zerolinewidth: 1,
            linecolor: 'black',
            linewidth: 1
        },
        yaxis: {
            range: [yMax, yMin],
            tickvals: yPos,
            ticktext: subgroupLabels.map(s => s.name),
            showgrid: true,
            gridcolor: 'lightgray',
            gridwidth: 1,
            zeroline: false
        },
        shapes: [
            {
                type: 'line',
                x0: 1,
                x1: 1,
                y0: yMin,
                y1: yMax,
                line: { color: 'gray', width: 1, dash: 'dash' }
            }
        ],
        // annotations: [
        //     ...Object.entries(pValues).map(([groupName, pValue], idx) => ({
        //         x: 1.05,
        //         xref: 'paper',
        //         y: groupLabels.find(g => g.name === groupName).y + 0.5,
        //         text: pValue,
        //         xanchor: 'left',
        //         yanchor: 'middle', // yanchor를 middle로 변경
        //         showarrow: false,
        //         font: { size: 10 }
        //     }))
        // ],
        margin: { l: 50, r: 50, t: 80, b: 50 },
        height: Object.keys(groupDefinitions["노출 기간"]).length * 80,
        hovermode: 'closest',
        paper_bgcolor: '#f9f9f9',
        plot_bgcolor: '#f9f9f9'
    };

    Plotly.newPlot(containerId, traces, layout);
}


function renderForestPlotTb4(department, disease, exposure, condition) {
    if (!window.csvDataTb4) {
        console.error("CSV 데이터(tb4)가 로드되지 않았습니다.");
        return;
    }

    const filteredData = window.csvDataTb4.filter(row => 
        row["분과"] === department && 
        row["질환"] === disease && 
        row["exposure"] === exposure && 
        row["condition"] === condition
    );
    // console.log("renderForestPlotTb4 - filteredData:", filteredData);

    const daysValues = [...new Set(filteredData.map(row => row["Days"]))].sort((a, b) => a - b);
    groupDefinitions = { "노출 기간": daysValues };
    // console.log("renderForestPlotTb4 - groupDefinitions:", groupDefinitions);

    const orData = [];
    ['pm25', 'pm10'].forEach(air => {
        const airData = filteredData.filter(row => row["air"].substring(0, 4).toLowerCase() === air.toLowerCase());
        // console.log(`renderForestPlotTb4 - airData for ${air}:`, airData);

        const dataMap = {};
        airData.forEach(row => {
            const day = row["Days"];
            const oddsRatio = parseFloat(row["OddsRatioEst"]);
            const lowerCL = parseFloat(row["LowerCL"]);
            const upperCL = parseFloat(row["UpperCL"]);
            dataMap[day] = {
                OddsRatioEst: isNaN(oddsRatio) ? 1.0 : oddsRatio,
                LowerCL: isNaN(lowerCL) ? 1.0 : lowerCL,
                UpperCL: isNaN(upperCL) ? 1.0 : upperCL,
                pValue: row["p-value"] || ""
            };
        });
        // console.log(`renderForestPlotTb4 - dataMap for ${air}:`, dataMap);

        const oddsRatios = [];
        const ciLowers = [];
        const ciUppers = [];
        const pValues = {};
        groupDefinitions["노출 기간"].forEach(day => {
            if (dataMap[day]) {
                oddsRatios.push(dataMap[day].OddsRatioEst);
                ciLowers.push(dataMap[day].LowerCL);
                ciUppers.push(dataMap[day].UpperCL);
                pValues[day] = dataMap[day].pValue;
            } else {
                oddsRatios.push(1.0);
                ciLowers.push(1.0);
                ciUppers.push(1.0);
                pValues[day] = "";
            }
        });

        orData.push({
            oddsRatios,
            ciLowers,
            ciUppers,
            pValues
        });
    });

    if (orData.length > 0) {
        createForestPlotTb4('forest-plot-tb4-pm25', orData[0], "PM 2.5");
    }
    if (orData.length > 1) {
        createForestPlotTb4('forest-plot-tb4-pm10', orData[1], "PM 10");
    }
}

// 그룹과 세부 그룹 매핑 정의 (한글화)
const groupMapping = {
    "연령": ["age650", "age651"], // 65세 미만, 65세 이상
    "성별": ["sex1", "sex2"], // 남성, 여성
    "수익수준": ["income1", "income2", "income3", "income9"], // < 30분위, 31 - 70 분위, >70 분위
    "흡연여부": ["smk1", "smk2", "smk3", "smk9"], // 비흡연자, 과거 흡연자, 현재 흡연자, 알 수 없음
    "체질량지수 분류": ["bmi_cat1", "bmi_cat2", "bmi_cat3", "bmi_cat4", "bmi_cat9"], // 저체중, 정상체중, 과체중, 비만, 알 수 없음
    "이상지질혈증": ["dyslip0", "dyslip1"], // 1년 이내 이상지질혈증 발생 안함, 발생
    "I 코드 전체 질환": ["icode0", "icode1"], // 1년 이내 I 코드 전체 질환 발생 안함, 발생
    "동반질환 지수": ["CCI<2", "CCI >=2"], // 동반질환 지수 <2, ≥2
    "심부전": ["HF0", "HF1", "hfail0", "hfail1"], // 1년 이내 심부전 발생 안함, 발생
    "협심증": ["angina0", "angina1"], // 1년 이내 협심증 발생 안함, 발생
    "심근경색": ["MI0", "MI1"], // 1년 이내 심근경색 발생 안함, 발생
    "위식도역류질환": ["GERD0", "GERD1"], // 1년 이내 GERD 발생 안함, 발생
    "HIV": ["HIV0", "HIV1"], // 1년 이내 HIV 발생 안함, 발생
    "결핵": ["TB0", "TB1"], // 발생일 이전 결핵 발생 안함, 발생
    "천식": ["Asthma0", "Asthma1", "asthma0", "asthma1"], // 1년 이내 천식 발생 안함, 발생
    "폐렴": ["Pneumo0", "Pneumo1"], // 5년 이내 폐렴 발생 안함, 발생
    "심방세동": ["ventfib0", "ventfib1"], // 1년 이내 심방세동 발생 안함, 발생
    "뇌혈관 질환": ["cereb0", "cereb1"], // 1년 이내 뇌혈관 질환 발생 안함, 발생
    "허혈성 심장 질환": ["ische0", "ische1"], // 1년 이내 허혈성 심장 질환 발생 안함, 발생
    "말초혈관 질환": ["periph0", "periph1"], // 1년 이내 말초혈관 질환 발생 안함, 발생
    "기관지확장증": ["BE0", "BE1"], // 1년 이내 기관지확장증 발생 안함, 발생
    "결합조직질환 관련 폐질환": ["CTD0", "CTD1"], // 결합조직 질환 관련 없는 간질성 폐질환, 관련 있음
    "정신질환 F 코드": ["fcode0", "fcode1"], // 1년 이내 F code 발생 안함, 발생
    "뇌졸중": ["h_stroke0", "h_stroke1"], // 1년 이내 뇌졸중 발생 안함, 발생
    "허혈성 뇌졸중": ["h_ich0", "h_ich1", "ich0", "ich1"], // 1년 이내 허혈성 뇌졸중 발생 안함, 발생
    "출혈성 뇌졸중": ["h_hrr0", "h_hrr1", "hrr0", "hrr1"], // 1년 이내 출혈성 뇌졸중 발생 안함, 발생
    "자가면역질환": ["autoimm0", "autoimm1"], // 1년 이내 자가면역질환 발생 안함, 발생
    "암": ["cancer0", "cancer1"], // 1년 이내 암 발생 안함, 발생
    "알레르기성 질환": ["allergy0", "allergy1"], // 1년 이내 알레르기성 질환 발생 안함, 발생
    "건선관절염": ["psa0", "psa1"], // 1년 이내 건선관절염 발생 안함, 발생
    "호지킨림프종": ["hodg0", "hodg1"], // 1년 이내 호지킨림프종 발생 안함, 발생
    "비호지킨림프종": ["nhodg0", "nhodg1"], // 1년 이내 비호지킨림프종 발생 안함, 발생
    "신세뇨관산증": ["renal_tub0", "renal_tub1"], // 1년 이내 신세뇨관산증 발생 안함, 발생
    "간질환": ["liver0", "liver1"], // 1년 이내 간질환 발생 안함, 발생
    "만성 신질환": ["chr_kid0", "chr_kid1", "CKD0", "CKD1"], // 1년 이내 만성 신질환 발생 안함, 발생
    "갑상선저하증": ["hypo_thy0", "hypo_thy1"], // 1년 이내 갑상선저하증 발생 안함, 발생
    "갑상선항진증": ["hyper_thy0", "hyper_thy1"], // 1년 이내 갑상선항진증 발생 안함, 발생
    "만성 폐쇄성 폐질환": ["copd0", "copd1"], // 1년 이내 만성 폐쇄성 폐질환 발생 안함, 발생
    "고혈압": ["hyper0", "hyper1"], // 1년 이내 고혈압 발생 안함, 발생
    "당뇨병": ["DM0", "DM1"], // 1년 이내 당뇨 발생 안함, 발생
    "아토피성 피부염": ["atopi0", "atopi1"], // 1년 이내 아토피성 피부염 발생 안함, 발생
    "급성 신부전": ["AKI0", "AKI1"], // 신장질환 중 급성신부전 아님, 급성신부전
    "알츠하이머병": ["Altzh0", "Altzh1"], // 1년 이내 알츠하이머병 발생 안함, 발생
    "항혈소판제 사용": ["Antiplatelet0", "Antiplatelet1"], // 항혈소판제 사용 없음, 사용 있음
    "항응고제 사용": ["Anticoagulant0", "Anticoagulant1"] // 항응고제 사용 없음, 사용 있음
};

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


// tb3 전용 groupMapping과 nameMapping (stats.xlsx 기반)
const groupMappingTb3 = {
    "연령": ["under 65", "under65", "age641", "age650", "over 65", "over65", "age651"],
    "성별": ["male", "sex_type0", "sex1", "female", "sex_type1", "sex2"],
    "의료수급 여부": ["normal", "medicaid0", "medicaid", "medicaid1"],
    "흡연력": ["smk_never", "smk11", "smk_ever", "smk12", "smk_unknown", "smk19"],
    "체질량지수": ["bmi_under25", "BMI_CAT1", "bmi_cat11", "bmi_over25", "BMI_CAT2", "bmi_cat12", "bmi_unknown", "BMI_CAT9", "bmi_cat19"],
    "고혈압": ["hyper0", "h_hyper0", "hyper1", "h_hyper1"],
    "당뇨": ["dm0", "dm1"],
    "이상지질혈증": ["dyslip0", "dyslip1"],
    "심혈관질환": ["icode0", "icode1"],
    "뇌혈관질환": ["cereb0", "cereb1"],
    "심부전": ["hfail0", "CHF0", "h_CHF0", "HF0", "hfail1", "CHF1", "h_CHF1", "HF1"],
    "허혈성 심장질환": ["ische0", "ische1"],
    "심근경색": ["MI0", "h_mi0", "MI1", "h_mi1"],
    "말초혈관질환": ["periph0", "periph1"],
    "심방세동": ["ventfib0", "ventfib1"],
    "협심증": ["angina0", "h_angina0", "angina1", "h_angina1"],
    "찰슨동반질환점수": ["cci<2", "g_index0", "cci>=2", "g_index1"],
    "위식도역류질환": ["gerd0", "h_gerd0", "gerd1", "h_gerd1"],
    "에이즈": ["HIV0", "HIV1"],
    "결핵": ["previous TB0", "previous TB1"],
    "천식": ["asthma0", "asthma1"],
    "만성폐쇄성폐질환": ["copd0", "h_copd0", "copd1", "h_copd1"],
    "폐렴": ["pneumo0", "pneumo1"],
    "기관지확장증": ["BE0", "BE1"],
    "정신질환": ["fcode0", "fcode10", "fcode1", "fcode11"],
    "뇌졸중": ["h_stroke0", "h_stroke1"],
    "허혈성 뇌졸중": ["h_ich0", "h_ich1"],
    "출혈성 뇌졸중": ["h_hrr0", "h_hrr1"],
    "건선관절염": ["psa0", "psa1"],
    "알레르기성 질환": ["ALLERGY0", "h_allergy0", "ALLERGY1", "h_allergy1"],
    "자가면역질환": ["autoimm0", "h_autoimm0", "autoimm1", "h_autoimm1"],
    "암": ["cancer0", "h_cancer0", "cancer1", "h_cancer1"],
    "만성콩팥병": ["chr_kid0", "chr_kid1"],
    "갑상샘항진증": ["hyper_thy0", "hyper_thy1"],
    "간질성폐질환": ["ILD0", "ILD1"],
    "간질환": ["liver0", "liver1"],
    "비호지킨림프종": ["nhodg0", "nhodg1"],
    "신세관산증": ["renal_tub0", "renal_tub1"],
    "아토피성 피부염": ["atopi0", "atopi1"],
    "알츠하이머병": ["Altzh0", "Altzh1"],
    "항응고제": ["Anticoagulant0", "Anticoagulant1"],
    "항혈소판제": ["Antiplatelet0", "Antiplatelet1"],
    "갑상샘저하증": ["hypo_thy0", "hypo_thy1"],
    "장기이식": ["trans0", "h_trans0", "trans1", "h_trans1"]
};

const nameMappingTb3 = {
    "under 65": "65세 미만",
    "under65": "65세 미만",
    "age641": "65세 미만",
    "age650": "65세 미만",
    "over 65": "65세 이상",
    "over65": "65세 이상",
    "age651": "65세 이상",
    "male": "남성",
    "sex_type0": "남성",
    "sex1": "남성",
    "female": "여성",
    "sex_type1": "여성",
    "sex2": "여성",
    "normal": "의료수급자 아님",
    "medicaid0": "의료수급자 아님",
    "medicaid": "의료수급자",
    "medicaid1": "의료수급자",
    "smk_never": "흡연력 비해당",
    "smk11": "흡연력 비해당",
    "smk_ever": "흡연력 해당",
    "smk12": "흡연력 해당",
    "smk_unknown": "흡연력 알 수 없음",
    "smk19": "흡연력 알 수 없음",
    "bmi_under25": "체질량지수 정상 이하",
    "BMI_CAT1": "체질량지수 정상 이하",
    "bmi_cat11": "체질량지수 정상 이하",
    "bmi_over25": "체질량지수 과체중 이상",
    "BMI_CAT2": "체질량지수 과체중 이상",
    "bmi_cat12": "체질량지수 과체중 이상",
    "bmi_unknown": "체질량지수 알 수 없음",
    "BMI_CAT9": "체질량지수 알 수 없음",
    "bmi_cat19": "체질량지수 알 수 없음",
    "hyper0": "질환 발생일로부터 1년 이내 고혈압 발생 안함",
    "h_hyper0": "질환 발생일로부터 1년 이내 고혈압 발생 안함",
    "hyper1": "질환 발생일로부터 1년 이내 고혈압 발생",
    "h_hyper1": "질환 발생일로부터 1년 이내 고혈압 발생",
    "dm0": "질환 발생일로부터 1년 이내 당뇨 발생 안함",
    "dm1": "질환 발생일로부터 1년 이내 당뇨 발생",
    "dyslip0": "질환 발생일로부터 1년 이내 이상지질혈증 발생 안함",
    "dyslip1": "질환 발생일로부터 1년 이내 이상지질혈증 발생",
    "icode0": "질환 발생일로부터 1년 이내 심혈관질환 발생 안함",
    "icode1": "질환 발생일로부터 1년 이내 심혈관질환 발생",
    "cereb0": "질환 발생일로부터 1년 이내 뇌혈관질환 발생 안함",
    "cereb1": "질환 발생일로부터 1년 이내 뇌혈관질환 발생",
    "hfail0": "질환 발생일로부터 1년 이내 심부전 발생 안함",
    "CHF0": "질환 발생일로부터 1년 이내 심부전 발생 안함",
    "h_CHF0": "질환 발생일로부터 1년 이내 심부전 발생 안함",
    "HF0": "질환 발생일로부터 1년 이내 심부전 발생 안함",
    "hfail1": "질환 발생일로부터 1년 이내 심부전 발생",
    "CHF1": "질환 발생일로부터 1년 이내 심부전 발생",
    "h_CHF1": "질환 발생일로부터 1년 이내 심부전 발생",
    "HF1": "질환 발생일로부터 1년 이내 심부전 발생",
    "ische0": "질환 발생일로부터 1년 이내 허혈성 심장질환 발생 안함",
    "ische1": "질환 발생일로부터 1년 이내 허혈성 심장질환 발생",
    "MI0": "질환 발생일로부터 1년 이내 심근경색 발생 안함",
    "h_mi0": "질환 발생일로부터 1년 이내 심근경색 발생 안함",
    "MI1": "질환 발생일로부터 1년 이내 심근경색 발생",
    "h_mi1": "질환 발생일로부터 1년 이내 심근경색 발생",
    "periph0": "질환 발생일로부터 1년 이내 말초혈관질환 발생 안함",
    "periph1": "질환 발생일로부터 1년 이내 말초혈관질환 발생",
    "ventfib0": "질환 발생일로부터 1년 이내 심방세동 발생 안함",
    "ventfib1": "질환 발생일로부터 1년 이내 심방세동 발생",
    "angina0": "질환 발생일로부터 1년 이내 협심증 발생 안함",
    "h_angina0": "질환 발생일로부터 1년 이내 협심증 발생 안함",
    "angina1": "질환 발생일로부터 1년 이내 협심증 발생",
    "h_angina1": "질환 발생일로부터 1년 이내 협심증 발생",
    "cci<2": "찰슨동반질환점수 2점 미만",
    "g_index0": "찰슨동반질환점수 2점 미만",
    "cci>=2": "찰슨동반질환점수 2점 이상",
    "g_index1": "찰슨동반질환점수 2점 이상",
    "gerd0": "질환 발생일로부터 1년 이내 위식도역류질환 발생 안함",
    "h_gerd0": "질환 발생일로부터 1년 이내 위식도역류질환 발생 안함",
    "gerd1": "질환 발생일로부터 1년 이내 위식도역류질환 발생",
    "h_gerd1": "질환 발생일로부터 1년 이내 위식도역류질환 발생",
    "HIV0": "질환 발생일로부터 1년 이내 에이즈 발생 안함",
    "HIV1": "질환 발생일로부터 1년 이내 에이즈 발생",
    "previous TB0": "질환 발생일 이전 결핵 발생 안함",
    "previous TB1": "질환 발생일 이전 결핵 발생",
    "asthma0": "질환 발생일로부터 1년 이내 천식 발생 안함",
    "asthma1": "질환 발생일로부터 1년 이내 천식 발생",
    "copd0": "질환 발생일로부터 1년 이내 만성폐쇄성폐질환 발생 안함",
    "h_copd0": "질환 발생일로부터 1년 이내 만성폐쇄성폐질환 발생 안함",
    "copd1": "질환 발생일로부터 1년 이내 만성폐쇄성폐질환 발생",
    "h_copd1": "질환 발생일로부터 1년 이내 만성폐쇄성폐질환 발생",
    "pneumo0": "질환 발생일로부터 5년 이내 폐렴 발생 안함",
    "pneumo1": "질환 발생일로부터 5년 이내 폐렴 발생",
    "BE0": "질환 발생일로부터 1년 이내 기관지확장증 발생 안함",
    "BE1": "질환 발생일로부터 1년 이내 기관지확장증 발생",
    "fcode0": "질환 발생일로부터 1년 이내 정신질환 발생 안함",
    "fcode10": "질환 발생일로부터 1년 이내 정신질환 발생 안함",
    "fcode1": "질환 발생일로부터 1년 이내 정신질환 발생",
    "fcode11": "질환 발생일로부터 1년 이내 정신질환 발생",
    "h_stroke0": "질환 발생일로부터 1년 이내 뇌졸중 발생 안함",
    "h_stroke1": "질환 발생일로부터 1년 이내 뇌졸중 발생",
    "h_ich0": "질환 발생일로부터 1년 이내 허혈성 뇌졸중 발생 안함",
    "h_ich1": "질환 발생일로부터 1년 이내 허혈성 뇌졸중 발생",
    "h_hrr0": "질환 발생일로부터 1년 이내 출혈성 뇌졸중 발생 안함",
    "h_hrr1": "질환 발생일로부터 1년 이내 출혈성 뇌졸중 발생",
    "psa0": "질환 발생일로부터 1년 이내 건선관절염 발생 안함",
    "psa1": "질환 발생일로부터 1년 이내 건선관절염 발생",
    "ALLERGY0": "질환 발생일로부터 1년 이내 알레르기성 질환 발생 안함",
    "h_allergy0": "질환 발생일로부터 1년 이내 알레르기성 질환 발생 안함",
    "ALLERGY1": "질환 발생일로부터 1년 이내 알레르기성 질환 발생",
    "h_allergy1": "질환 발생일로부터 1년 이내 알레르기성 질환 발생",
    "autoimm0": "질환 발생일로부터 1년 이내 자가면역질환 발생 안함",
    "h_autoimm0": "질환 발생일로부터 1년 이내 자가면역질환 발생 안함",
    "autoimm1": "질환 발생일로부터 1년 이내 자가면역질환 발생",
    "h_autoimm1": "질환 발생일로부터 1년 이내 자가면역질환 발생",
    "cancer0": "질환 발생일로부터 1년 이내 암 발생 안함",
    "h_cancer0": "질환 발생일로부터 1년 이내 암 발생 안함",
    "cancer1": "질환 발생일로부터 1년 이내 암 발생",
    "h_cancer1": "질환 발생일로부터 1년 이내 암 발생",
    "chr_kid0": "질환 발생일로부터 1년 이내 만성콩팥병 발생 안함",
    "chr_kid1": "질환 발생일로부터 1년 이내 만성콩팥병 발생",
    "hyper_thy0": "질환 발생일로부터 1년 이내 갑상샘항진증 발생 안함",
    "hyper_thy1": "질환 발생일로부터 1년 이내 갑상샘항진증 발생",
    "ILD0": "질환 발생일로부터 1년 이내 간질성폐질환 발생 안함",
    "ILD1": "질환 발생일로부터 1년 이내 간질성폐질환 발생",
    "liver0": "질환 발생일로부터 1년 이내 간질환 발생 안함",
    "liver1": "질환 발생일로부터 1년 이내 간질환 발생",
    "nhodg0": "질환 발생일로부터 1년 이내 비호지킨림프종 발생 안함",
    "nhodg1": "질환 발생일로부터 1년 이내 비호지킨림프종 발생",
    "renal_tub0": "질환 발생일로부터 1년 이내 신세관산증 발생 안함",
    "renal_tub1": "질환 발생일로부터 1년 이내 신세관산증 발생",
    "atopi0": "질환 발생일로부터 1년 이내 아토피성 피부염 발생 안함",
    "atopi1": "질환 발생일로부터 1년 이내 아토피성 피부염 발생",
    "Anticoagulant0": "항응고제 사용 없음",
    "Anticoagulant1": "항응고제 사용 있음",
    "Altzh0": "질환 발생일로부터 1년 이내 알츠하이머병 발생 안함",
    "Altzh1": "질환 발생일로부터 1년 이내 알츠하이머병 발생",
    "Antiplatelet0": "항혈소판제 사용 없음",
    "Antiplatelet1": "항혈소판제 사용 있음",
    "hypo_thy0": "질환 발생일로부터 1년 이내 갑상샘저하증 발생 안함",
    "hypo_thy1": "질환 발생일로부터 1년 이내 갑상샘저하증 발생",
    "trans0": "질환 발생일 이전 장기이식 과거력 없음",
    "h_trans0": "질환 발생일 이전 장기이식 과거력 없음",
    "trans1": "질환 발생일 이전 장기이식 과거력 있음",
    "h_trans1": "질환 발생일 이전 장기이식 과거력 있음"
};

function updateFilterTitle(view) {
    const filterTitle = document.getElementById('filter-title');
    const { department, disease, condition, exposure } = window.currentFilters || {};

    if (view === 'stats') {
        filterTitle.textContent = `인구사회학적 정보 (Table 1) & Main result & sensitivity analysis\n[분과: ${department}, 질환: ${disease}, 상태: ${condition}, 노출: ${exposure}]`;
    } else if (view === 'graph') {
        filterTitle.textContent = `하위 그룹 분석 결과\n[분과: ${department}, 질환: ${disease}, 상태: ${condition}, 노출: ${exposure}]`;
    }
}

function applyFilter() {
    const department = document.getElementById('department').value;
    const condition = document.getElementById('condition').value;
    const exposure = document.getElementById('exposure').value;
    const disease = document.getElementById('disease').value;

    // console.log("applyFilter - Selected values:", { department, condition, exposure, disease });

    // URL 파라미터 업데이트 (새로고침 없이)
    const params = new URLSearchParams({
        department: department,
        condition: condition,
        exposure: exposure,
        disease: disease
    });
    window.history.replaceState({}, '', `details.html?${params.toString()}`);

    // renderFilteredData 호출로 화면 갱신
    window.currentFilters = { department, disease, condition, exposure };
    renderFilteredData();
}

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

function setupSvgTooltip(svgObject) {
    const svgDoc = svgObject.contentDocument;
    if (svgDoc) {
        const svg = svgDoc.querySelector('svg');
        if (svg) {
            svg.style.width = '100%';
            svg.style.height = 'auto';

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            document.body.appendChild(tooltip);

            const targetGroups = svg.querySelectorAll('g[id^="rect-"]');
            targetGroups.forEach(group => {
                const path = group.querySelector('path');
                if (path) {
                    path.addEventListener('mouseover', (e) => {
                        const or = group.getAttribute('data-or');
                        const ciLower = group.getAttribute('data-ci-lower');
                        const ciUpper = group.getAttribute('data-ci-upper');
                        tooltip.textContent = `OR: ${or}, CI: [${ciLower}, ${ciUpper}]`;
                        tooltip.style.display = 'block';
                        adjustTooltipPosition(e, tooltip, svgObject, path);
                    });
                    path.addEventListener('mousemove', (e) => {
                        adjustTooltipPosition(e, tooltip, svgObject, path);
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

function adjustTooltipPosition(e, tooltip, svgObject, path) {
    const svgRect = svgObject.getBoundingClientRect();
    
    const svg = svgObject.contentDocument.querySelector('svg');
    const point = svg.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    
    const ctm = svg.getScreenCTM();
    const svgPoint = point.matrixTransform(ctm.inverse());
    
    const pathRect = path.getBBox();
    const rectCenterX = pathRect.x + pathRect.width / 2;
    const rectTopY = pathRect.y;
    
    const pageX = svgRect.left + (rectCenterX / svg.viewBox.baseVal.width) * svgRect.width;
    const pageY = svgRect.top + (rectTopY / svg.viewBox.baseVal.height) * svgRect.height;
    
    let x = pageX - tooltip.offsetWidth / 2;
    let y = pageY - tooltip.offsetHeight - 5;
    
    const tooltipWidth = tooltip.offsetWidth;
    const tooltipHeight = tooltip.offsetHeight;
    if (x + tooltipWidth > window.innerWidth) x = window.innerWidth - tooltipWidth - 5;
    if (x < 0) x = 5;
    if (y < 0) y = 5;
    
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}


function renderForestPlotTb2Stroke(department, disease, exposure, condition, subDiseases) {
    if (!window.csvDataTb2) {
        console.error("CSV 데이터(tb2)가 로드되지 않았습니다.");
        return;
    }
    const orData = [];
    ['pm25', 'pm10'].forEach(air => {
        const filteredData = window.csvDataTb2.filter(row => 
            row["분과"] === department && 
            subDiseases.includes(row["질환"]) && 
            row["air"].toLowerCase() === air && 
            row["condition"] === condition && 
            row["model"] === "adjust"
        );
        console.log("Filtered Data:", filteredData);
        const data = {
            oddsRatios: [],
            ciLowers: [],
            ciUppers: [],
            pValues: {},
            subgroups: []
        };
        subDiseases.forEach(subDisease => {
            const row = filteredData.find(r => r["질환"] === subDisease);
            if (row) {
                data.oddsRatios.push(parseFloat(row["OddsRatioEst"]) || 1.0);
                data.ciLowers.push(parseFloat(row["LowerCL"]) || 1.0);
                data.ciUppers.push(parseFloat(row["UpperCL"]) || 1.0);
                data.pValues[subDisease] = row["p-value"] || "";
                data.subgroups.push(subDisease);
            } else {
                data.oddsRatios.push(1.0);
                data.ciLowers.push(1.0);
                data.ciUppers.push(1.0);
                data.pValues[subDisease] = "";
                data.subgroups.push(subDisease);
            }
        });

        orData.push(data);
    });

    if (orData.length > 0) {
        createForestPlotTb2Stroke('forest-plot-tb2-pm25', orData[0], 'PM 2.5');
    }
    if (orData.length > 1) {
        createForestPlotTb2Stroke('forest-plot-tb2-pm10', orData[1], 'PM 10');
    }
}

function createForestPlotTb2Stroke(containerId, data, title) {
    const { oddsRatios, ciLowers, ciUppers, pValues, subgroups } = data;
    const yPos = subgroups.map((_, i) => i * 1.5); // 간격 확대
    const groupLabels = [{ name: "Adjust", y: -0.5 }];
    const subgroupLabels = subgroups.map(name => ({ name }));

    function isSignificant(lower, upper) {
        return !(lower <= 1 && upper >= 1);
    }

    const adjustedOddsRatios = [];
    const adjustedCiLowers = [];
    const adjustedCiUppers = [];
    const adjustedTooltipText = [];
    yPos.forEach((_, i) => {
        if (i < oddsRatios.length && oddsRatios[i] !== undefined && !isNaN(oddsRatios[i])) {
            adjustedOddsRatios.push(oddsRatios[i]);
            adjustedCiLowers.push(ciLowers[i]);
            adjustedCiUppers.push(ciUppers[i]);
            const sig = isSignificant(ciLowers[i], ciUppers[i]);
            adjustedTooltipText.push(`OR: ${oddsRatios[i].toFixed(3)}${sig ? '*' : ''}<br>CI: [${ciLowers[i].toFixed(3)}, ${ciUppers[i].toFixed(3)}]`);
        } else {
            adjustedOddsRatios.push(1.0);
            adjustedCiLowers.push(1.0);
            adjustedCiUppers.push(1.0);
            adjustedTooltipText.push("No data");
        }
    });

    const traces = [
        ...adjustedOddsRatios.map((or, i) => ({
            x: [adjustedCiLowers[i], adjustedCiUppers[i]],
            y: [yPos[i], yPos[i]],
            mode: 'lines',
            line: {
                color: 'red',
                width: 8
            },
            text: [adjustedTooltipText[i], adjustedTooltipText[i]],
            hoverinfo: 'text',
            hoverlabel: {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                font: { color: 'white' }
            },
            showlegend: false
        })),
        {
            x: adjustedOddsRatios,
            y: yPos,
            mode: 'markers',
            marker: {
                size: 8,
                color: 'black',
                line: { width: 0.5, color: 'black' }
            },
            text: adjustedTooltipText,
            hoverinfo: 'text',
            showlegend: false
        }
    ];

    const yMin = Math.min(...yPos, ...groupLabels.map(g => g.y)) - 1;
    const yMax = Math.max(...yPos) + 1;

    const layout = {
        title: {
            text: title,
            x: 0.5,
            xanchor: 'center',
            pad: { t: 20 }
        },
        xaxis: {
            title: 'Odds Ratio',
            range: [
                Math.max(0.85, 1.00 - Math.max(Math.abs(Math.min(...adjustedCiLowers) - 1.00), Math.abs(Math.max(...adjustedCiUppers) - 1.00)) - 0.01),
                Math.min(1.15, 1.00 + Math.max(Math.abs(Math.min(...adjustedCiLowers) - 1.00), Math.abs(Math.max(...adjustedCiUppers) - 1.00)) + 0.01)
            ],
            tickvals: (() => {
                const minVal = Math.max(0.85, Math.min(...adjustedCiLowers));
                const maxVal = Math.min(1.15, Math.max(...adjustedCiUppers));
                if (maxVal - minVal < 0.04) {
                    return [0.98, 0.99, 1.00, 1.01, 1.02];
                }
                const step = (maxVal - minVal) / 4;
                return [minVal, minVal + step, minVal + 2 * step, minVal + 3 * step, maxVal].map(val => Math.round(val * 100) / 100);
            })(),
            ticktext: (() => {
                const minVal = Math.max(0.85, Math.min(...adjustedCiLowers));
                const maxVal = Math.min(1.15, Math.max(...adjustedCiUppers));
                if (maxVal - minVal < 0.04) {
                    return ['0.98', '0.99', '1.00', '1.01', '1.02'];
                }
                const step = (maxVal - minVal) / 4;
                return [minVal, minVal + step, minVal + 2 * step, minVal + 3 * step, maxVal].map(val => val.toFixed(2));
            })(),
            tickangle: 0,
            showgrid: false,
            zeroline: true,
            zerolinecolor: 'gray',
            zerolinewidth: 1,
            linecolor: 'black',
            linewidth: 1
        },
        yaxis: {
            range: [yMax, yMin],
            tickvals: yPos,
            ticktext: subgroupLabels.map(s => {
                const maxLength = 6;
                let name = s.name;
                if (name.includes('(')) {
                    return name.replace('(', '<br>(');
                }
                if (name.length > maxLength) {
                    const words = name.split(' ');
                    
                    let wrapped = '';
                    let currentLine = '';
                    words.forEach(word => {
                        if ((currentLine + word).length > maxLength) {
                            wrapped += (wrapped ? '<br>' : '') + currentLine;
                            currentLine = word + ' ';
                        } else {
                            currentLine += word + ' ';
                        }
                    });
                    wrapped += (wrapped ? '<br>' : '') + currentLine;
                    return wrapped.trim();
                }
                return name;
            }),
            showgrid: true,
            gridcolor: 'lightgray',
            gridwidth: 1,
            zeroline: false
        },
        shapes: [
            {
                type: 'line',
                x0: 1,
                x1: 1,
                y0: yMin,
                y1: yMax,
                line: { color: 'gray', width: 1, dash: 'dash' }
            }
        ],
        annotations: [
            ...Object.entries(pValues).map(([subgroup, pValue], idx) => ({
                x: 1.05,
                xref: 'paper',
                y: yPos[idx],
                text: pValue,
                xanchor: 'left',
                yanchor: 'middle',
                showarrow: false,
                font: { size: 10 }
            }))
        ],
        margin: { l: 100, r: 50, t: 30, b: 80 },
        height: subgroups.length * 50 + 200,
        hovermode: 'closest',
        paper_bgcolor: '#f9f9f9',
        plot_bgcolor: '#f9f9f9'
    };

    Plotly.newPlot(containerId, traces, layout);
}
// CSTA 2026 PK-12 Computer Science Standards — High School Specialty subareas.
// Source: official CSTA standards REST API (csteachers.org/wp-json/wp/v2/standard),
// 2026 standards, pulled verbatim (identifier + statement). Only the two subareas
// the teacher picks from are included, matching the High School Specialty view:
// Artificial Intelligence (24) and Cybersecurity (27). These are real published
// standards — do not paraphrase the statements.
//
// Identifier scheme: S1 = Specialty I, S2 = Specialty II; AIN = Artificial
// Intelligence, CYB = Cybersecurity.

export const STANDARD_AREAS = [
  {
    id: "ai",
    label: "Artificial Intelligence",
    standards: [
    { code: "S1-AIN-DD-01", statement: "Analyze AI systems to differentiate the types of problems they address." },
    { code: "S1-AIN-DD-02", statement: "Modify AI system training data to improve fairness and accuracy in outputs." },
    { code: "S1-AIN-DD-03", statement: "Create an application using a prebuilt supervised learning model to make a classification or prediction." },
    { code: "S1-AIN-DD-04", statement: "Compare data representations and how representation choice constrains applicable algorithms." },
    { code: "S1-AIN-DD-05", statement: "Evaluate whether an AI or non-AI computational solution is appropriate for a real-world problem." },
    { code: "S1-AIN-DS-06", statement: "Examine how data flows through a neural network structure." },
    { code: "S1-AIN-DS-07", statement: "Apply data acquisition, cleaning, and transformation techniques to prepare data for AI analysis." },
    { code: "S1-AIN-HR-08", statement: "Plan safeguards for AI systems that protect human well-being and privacy while ensuring meaningful human involvement in decision-making." },
    { code: "S1-AIN-HR-09", statement: "Analyze the potential biases and limitations of AI systems." },
    { code: "S1-AIN-HR-10", statement: "Analyze the environmental impacts of widespread AI adoption." },
    { code: "S1-AIN-PP-11", statement: "Integrate a prebuilt AI agent into an application." },
    { code: "S1-AIN-PP-12", statement: "Analyze how AI tools shape user experiences for people with diverse backgrounds and characteristics." },
    { code: "S1-AIN-PP-13", statement: "Assess how unauthorized data collection has influenced the practice of training AI models." },
    { code: "S1-AIN-PP-14", statement: "Evaluate how ethical implications of AI have changed over time." },
    { code: "S2-AIN-DD-01", statement: "Analyze problems that can be addressed using unsupervised learning." },
    { code: "S2-AIN-DD-02", statement: "Optimize an AI algorithm’s performance for a given problem." },
    { code: "S2-AIN-DD-03", statement: "Create an application using a complex supervised learning model." },
    { code: "S2-AIN-DS-04", statement: "Evaluate metadata and data pipelines to support transparency in AI model selection and deployment." },
    { code: "S2-AIN-DS-05", statement: "Transform data to meet the input requirements of an AI algorithm." },
    { code: "S2-AIN-HR-06", statement: "Develop a policy that promotes transparency in AI applications." },
    { code: "S2-AIN-HR-07", statement: "Analyze how model optimization choices impact a model’s performance, interpretability, and fairness." },
    { code: "S2-AIN-PP-08", statement: "Develop an AI agent to accomplish a defined task." },
    { code: "S2-AIN-PP-09", statement: "Develop a professional communication artifact by interpreting technical AI results for diverse audiences." },
    { code: "S2-AIN-PP-10", statement: "Debate aspects of AI regulatory frameworks and legislation across countries." },
    ],
  },
  {
    id: "cyb",
    label: "Cybersecurity",
    standards: [
    { code: "S1-CYB-CP-11", statement: "Explain the importance of cybersecurity policies in protecting organizational assets and mitigating risks." },
    { code: "S1-CYB-CP-12", statement: "Explain key components of effective security policies." },
    { code: "S1-CYB-ND-01", statement: "Analyze the role of network services and protocols in secure communication and their potential vulnerabilities." },
    { code: "S1-CYB-ND-02", statement: "Examine the concepts of the Open Systems Interconnection (OSI) model and their role in network communication." },
    { code: "S1-CYB-ND-03", statement: "Distinguish between networks based on their protocols, topologies, and addressing schemes." },
    { code: "S1-CYB-ND-04", statement: "Examine security risks in digital systems and corresponding mitigation strategies." },
    { code: "S1-CYB-NO-05", statement: "Apply diagnostic tools and techniques to resolve network connectivity issues." },
    { code: "S1-CYB-NO-06", statement: "Analyze system processes and network activity using command-line tools to identify potential security concerns." },
    { code: "S1-CYB-PP-13", statement: "Analyze the potential consequences of a cybersecurity decision on individuals, organizations, and society." },
    { code: "S1-CYB-PP-14", statement: "Analyze social engineering techniques and how they exploit human cognitive biases and organizational weaknesses." },
    { code: "S1-CYB-PP-15", statement: "Translate cybersecurity concepts, risks, and solutions clearly to both technical and nontechnical audiences." },
    { code: "S1-CYB-TS-07", statement: "Analyze how common cyber threats related to network activity exploit system vulnerabilities." },
    { code: "S1-CYB-TS-08", statement: "Evaluate a security threat using the CIA triad, states of data, and types of control." },
    { code: "S1-CYB-TS-09", statement: "Analyze how encryption methods in network communication protect privacy and security." },
    { code: "S1-CYB-TS-10", statement: "Evaluate security measures as part of a layered defense strategy to protect sensitive information." },
    { code: "S2-CYB-CP-09", statement: "Debate how various regulations impact organizational security policies, procedures, and compliance." },
    { code: "S2-CYB-ND-01", statement: "Integrate security features in networking hardware and software." },
    { code: "S2-CYB-ND-02", statement: "Design a secure network, including servers, switches, routers, endpoints, and firewalls." },
    { code: "S2-CYB-ND-03", statement: "Evaluate the security implications of different network topologies." },
    { code: "S2-CYB-NO-04", statement: "Analyze network traffic patterns to distinguish between normal and potentially malicious behavior." },
    { code: "S2-CYB-NO-05", statement: "Analyze cybersecurity tasks to improve efficiency and reliability." },
    { code: "S2-CYB-PP-10", statement: "Analyze the benefits, risks, and ethical implications of AI in cybersecurity." },
    { code: "S2-CYB-PP-11", statement: "Analyze cybersecurity vulnerabilities and incidents to inform responsible disclosure practices." },
    { code: "S2-CYB-PP-12", statement: "Create documentation of cybersecurity processes and decisions that supports team coordination and accountability." },
    { code: "S2-CYB-TS-06", statement: "Design access controls to protect sensitive information." },
    { code: "S2-CYB-TS-07", statement: "Evaluate security risks to determine appropriate risk management strategies." },
    { code: "S2-CYB-TS-08", statement: "Examine an incident response plan for a real-world scenario." },
    ],
  },
]

export function allStandards() {
  return STANDARD_AREAS.flatMap((a) => a.standards.map((s) => ({ ...s, areaId: a.id, areaLabel: a.label })))
}

export function getStandard(code) {
  return allStandards().find((s) => s.code === code) || null
}

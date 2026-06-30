import { useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const emptyEducation = {
  level: "",
  degree: "",
  institution: "",
  score: "",
  year: "",
};

const emptyExperience = {
  company: "",
  role: "",
  duration: "",
  description: "",
};

const emptyProject = {
  title: "",
  techStack: "",
  duration: "",
  description: "",
};

const initialResumeData = {
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  location: "",
  summary: "",
  education: [{ ...emptyEducation }],
  experiences: [{ ...emptyExperience }],
  projects: [{ ...emptyProject }],
  technicalSkills: "",
  domainSkills: "",
  softSkills: "",
  languages: "",
  certifications: "",
  leadership: "",
  achievements: "",
};

const educationLabels = [
  "Class X",
  "Class XII",
  "Diploma",
  "Bachelor's",
  "Master's",
  "PhD",
];

const splitItems = (value) =>
  String(value || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);

const joinNonEmpty = (...parts) => parts.filter(Boolean).join(" | ");

const hasRequiredResumeFields = (resumeData) => {
  return (
    resumeData.name.trim() &&
    resumeData.email.trim() &&
    resumeData.phone.trim() &&
    resumeData.education.length > 0 &&
    resumeData.education[0].degree.trim() &&
    resumeData.education[0].institution.trim() &&
    resumeData.projects.length > 0 &&
    resumeData.projects[0].title.trim()
  );
};

export default function ResumeBuilder() {
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState("");
  const [resumeData, setResumeData] = useState(initialResumeData);
  const resumeRef = useRef(null);

  const updateField = (field) => (event) => {
    setResumeData((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const updateArrayField = (arrayName, index, field, value) => {
    setResumeData((current) => {
      const updated = current[arrayName].map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      );

      return {
        ...current,
        [arrayName]: updated,
      };
    });
  };

  const addArrayItem = (arrayName, emptyItem) => {
    setResumeData((current) => ({
      ...current,
      [arrayName]: [...current[arrayName], { ...emptyItem }],
    }));
  };

  const removeArrayItem = (arrayName, index) => {
    setResumeData((current) => ({
      ...current,
      [arrayName]: current[arrayName].filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const downloadPDF = async () => {
    if (!hasRequiredResumeFields(resumeData)) {
      alert("Please fill Name, Email, Phone, at least one Education entry, and at least one Project before downloading.");
      return;
    }

    const input = resumeRef.current;
    if (!input) {
      alert("Resume preview is not ready yet.");
      return;
    }

    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pageWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${resumeData.name || "resume"}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      alert("Unable to generate the resume PDF. Please try again.");
    }
  };

  const handleGeneratePreview = () => {
    if (!hasRequiredResumeFields(resumeData)) {
      alert("Please fill Name, Email, Phone, at least one Education entry, and at least one Project before generating the resume.");
      return;
    }

    setStep(10);
  };

  const renderBulletLines = (text) => {
    const items = splitItems(text);

    if (items.length === 0) {
      return null;
    }

    return (
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        {items.map((item, index) => (
          <li key={index} style={{ lineHeight: 1.5 }}>
            {item}
          </li>
        ))}
      </ul>
    );
  };

  const sectionStyle = {
    borderTop: "1px solid #d9d9d9",
    paddingTop: 12,
    marginTop: 12,
  };

  const labelStyle = {
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "#334155",
    fontWeight: 700,
    marginBottom: 6,
  };

  const textInputClass = "bg-slate-800 p-3 rounded-lg outline-none text-white placeholder:text-slate-400 border border-slate-700 focus:border-blue-500";
  const textareaClass = "bg-slate-800 p-3 rounded-lg outline-none text-white placeholder:text-slate-400 border border-slate-700 focus:border-blue-500";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-8">
      {step === 0 && (
        <>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-5xl font-bold tracking-tight">📄 Build Your Resume</h1>
              <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-400">
                Create an ATS-friendly resume in minutes by completing each step below.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  title: "ATS Friendly",
                  description: "Best for placements, internships and ATS screening.",
                  icon: "📄",
                },
                {
                  title: "Modern",
                  description: "Clean and modern design for tech roles.",
                  icon: "🚀",
                },
                {
                  title: "Professional",
                  description: "Traditional corporate resume layout.",
                  icon: "💼",
                },
              ].map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setTemplate(item.title)}
                  className={`text-left cursor-pointer rounded-2xl border p-6 transition-all hover:scale-[1.02] ${
                    template === item.title
                      ? "border-blue-500 bg-slate-800"
                      : "border-slate-700 bg-slate-900"
                  }`}
                >
                  <div className="text-4xl mb-4">{item.icon}</div>
                  <h2 className="text-xl font-semibold mb-2">{item.title}</h2>
                  <p className="text-slate-400 text-sm">{item.description}</p>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!template}
              onClick={() => setStep(1)}
              className="mt-10 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        </>
      )}

      {step === 1 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Personal Information</h1>
              <p className="text-slate-400 mt-2">Complete the details below to continue.</p>
            </div>

            <button
              type="button"
              onClick={() => setStep(0)}
              className="bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700"
            >
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[10%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 1 of 10</h2>

            <div className="grid md:grid-cols-2 gap-4">
              <input type="text" name="name" value={resumeData.name || ""} onChange={updateField("name")} placeholder="Full Name" className={textInputClass} />
              <input type="email" name="email" value={resumeData.email || ""} onChange={updateField("email")} placeholder="Email Address" className={textInputClass} />
              <input type="text" name="phone" value={resumeData.phone || ""} onChange={updateField("phone")} placeholder="Phone Number" className={textInputClass} />
              <input type="text" name="linkedin" value={resumeData.linkedin || ""} onChange={updateField("linkedin")} placeholder="LinkedIn Profile" className={textInputClass} />
              <input type="text" name="location" value={resumeData.location || ""} onChange={updateField("location")} placeholder="Location" className={textInputClass} />
            </div>

            <button type="button" onClick={() => setStep(2)} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Professional Summary</h1>
              <p className="text-slate-400 mt-2">Add your professional summary.</p>
            </div>

            <button type="button" onClick={() => setStep(1)} className="bg-slate-800 px-4 py-2 rounded-lg">
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[20%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 2 of 10</h2>
            <textarea
              name="summary"
              value={resumeData.summary || ""}
              onChange={updateField("summary")}
              placeholder="Example: Final-year Computer Science student with strong problem-solving, web development, and data analysis skills, seeking a placement opportunity in software engineering."
              className={`${textareaClass} w-full h-40`}
            />

            <button type="button" onClick={() => setStep(3)} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Education</h1>
              <p className="text-slate-400 mt-2">Add your education details.</p>
            </div>

            <button type="button" onClick={() => setStep(2)} className="bg-slate-800 px-4 py-2 rounded-lg">
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[30%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 3 of 10</h2>
            <div className="space-y-4">
              {resumeData.education.map((education, index) => (
                <div key={index} className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Education {index + 1}</h3>
                    {resumeData.education.length > 1 && (
                      <button type="button" onClick={() => removeArrayItem("education", index)} className="bg-red-600 px-3 py-1 rounded-lg hover:bg-red-700">
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <select value={education.level || ""} onChange={(event) => updateArrayField("education", index, "level", event.target.value)} className={textInputClass}>
                      <option value="">Select Level</option>
                      {educationLabels.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>

                    <input type="text" placeholder="Degree / Stream" value={education.degree || ""} onChange={(event) => updateArrayField("education", index, "degree", event.target.value)} className={textInputClass} />
                    <input type="text" placeholder="Institution Name" value={education.institution || ""} onChange={(event) => updateArrayField("education", index, "institution", event.target.value)} className={textInputClass} />
                    <input type="text" placeholder="CGPA / Percentage" value={education.score || ""} onChange={(event) => updateArrayField("education", index, "score", event.target.value)} className={textInputClass} />
                    <input type="text" placeholder="Year" value={education.year || ""} onChange={(event) => updateArrayField("education", index, "year", event.target.value)} className={textInputClass} />
                  </div>
                </div>
              ))}

              <button type="button" onClick={() => addArrayItem("education", emptyEducation)} className="bg-green-600 px-5 py-3 rounded-xl hover:bg-green-700">
                + Add Education
              </button>
            </div>

            <button type="button" onClick={() => setStep(4)} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Work Experience & Internships</h1>
              <p className="text-slate-400 mt-2">Use bullets in the description for better placement-resume readability.</p>
            </div>

            <button type="button" onClick={() => setStep(3)} className="bg-slate-800 px-4 py-2 rounded-lg">
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[40%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 4 of 10</h2>
            <div className="space-y-4">
              {resumeData.experiences.map((experience, index) => (
                <div key={index} className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Experience {index + 1}</h3>
                    {resumeData.experiences.length > 1 && (
                      <button type="button" onClick={() => removeArrayItem("experiences", index)} className="bg-red-600 px-3 py-1 rounded-lg hover:bg-red-700">
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Company" value={experience.company || ""} onChange={(event) => updateArrayField("experiences", index, "company", event.target.value)} className={textInputClass} />
                    <input type="text" placeholder="Role" value={experience.role || ""} onChange={(event) => updateArrayField("experiences", index, "role", event.target.value)} className={textInputClass} />
                    <input type="text" placeholder="Duration" value={experience.duration || ""} onChange={(event) => updateArrayField("experiences", index, "duration", event.target.value)} className={textInputClass} />
                  </div>

                  <textarea
                    placeholder="Describe responsibilities, achievements, and tools used."
                    value={experience.description || ""}
                    onChange={(event) => updateArrayField("experiences", index, "description", event.target.value)}
                    className={`${textareaClass} w-full mt-4 h-32`}
                  />
                </div>
              ))}

              <button type="button" onClick={() => addArrayItem("experiences", emptyExperience)} className="bg-green-600 px-5 py-3 rounded-xl hover:bg-green-700">
                + Add Experience
              </button>
            </div>

            <button type="button" onClick={() => setStep(5)} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-slate-400 mt-2">Add technical projects with stack, duration, and impact.</p>
            </div>

            <button type="button" onClick={() => setStep(4)} className="bg-slate-800 px-4 py-2 rounded-lg">
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[50%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 5 of 10</h2>
            <div className="space-y-4">
              {resumeData.projects.map((project, index) => (
                <div key={index} className="bg-slate-800 p-5 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-lg">Project {index + 1}</h3>
                    {resumeData.projects.length > 1 && (
                      <button type="button" onClick={() => removeArrayItem("projects", index)} className="bg-red-600 px-3 py-1 rounded-lg hover:bg-red-700">
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Project Title" value={project.title || ""} onChange={(event) => updateArrayField("projects", index, "title", event.target.value)} className={textInputClass} />
                    <input type="text" placeholder="Tech Stack" value={project.techStack || ""} onChange={(event) => updateArrayField("projects", index, "techStack", event.target.value)} className={textInputClass} />
                    <input type="text" placeholder="Duration" value={project.duration || ""} onChange={(event) => updateArrayField("projects", index, "duration", event.target.value)} className={textInputClass} />
                  </div>

                  <textarea
                    placeholder="Describe the project, your contribution, and impact."
                    value={project.description || ""}
                    onChange={(event) => updateArrayField("projects", index, "description", event.target.value)}
                    className={`${textareaClass} w-full mt-4 h-32`}
                  />
                </div>
              ))}

              <button type="button" onClick={() => addArrayItem("projects", emptyProject)} className="bg-green-600 px-5 py-3 rounded-xl hover:bg-green-700">
                + Add Project
              </button>
            </div>

            <button type="button" onClick={() => setStep(6)} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Skills</h1>
              <p className="text-slate-400 mt-2">Break skills into clear placement-resume categories.</p>
            </div>

            <button type="button" onClick={() => setStep(5)} className="bg-slate-800 px-4 py-2 rounded-lg">
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[60%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 6 of 10</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <textarea name="technicalSkills" value={resumeData.technicalSkills || ""} onChange={updateField("technicalSkills")} placeholder="Technical Skills: Java, Python, React, SQL" className={`${textareaClass} h-32`} />
              <textarea name="domainSkills" value={resumeData.domainSkills || ""} onChange={updateField("domainSkills")} placeholder="Domain Skills: Data Analysis, Web Development, Cloud" className={`${textareaClass} h-32`} />
              <textarea name="softSkills" value={resumeData.softSkills || ""} onChange={updateField("softSkills")} placeholder="Soft Skills: Leadership, Communication, Teamwork" className={`${textareaClass} h-32`} />
              <textarea name="languages" value={resumeData.languages || ""} onChange={updateField("languages")} placeholder="Languages: English, Hindi, Tamil" className={`${textareaClass} h-32`} />
            </div>

            <button type="button" onClick={() => setStep(7)} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Certifications</h1>
              <p className="text-slate-400 mt-2">List certifications separated by lines or bullet points.</p>
            </div>

            <button type="button" onClick={() => setStep(6)} className="bg-slate-800 px-4 py-2 rounded-lg">
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[70%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 7 of 10</h2>
            <textarea
              name="certifications"
              value={resumeData.certifications || ""}
              onChange={updateField("certifications")}
              placeholder="AWS Certified Cloud Practitioner\nGoogle Data Analytics Certificate"
              className={`${textareaClass} w-full h-40`}
            />

            <button type="button" onClick={() => setStep(8)} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 8 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Leadership / Co-Curricular</h1>
              <p className="text-slate-400 mt-2">Add leadership roles, clubs, events, or volunteer work.</p>
            </div>

            <button type="button" onClick={() => setStep(7)} className="bg-slate-800 px-4 py-2 rounded-lg">
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[80%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 8 of 10</h2>
            <textarea
              name="leadership"
              value={resumeData.leadership || ""}
              onChange={updateField("leadership")}
              placeholder="Example: Core Member, Coding Club | Event Coordinator, Tech Fest | Volunteer, NGO"
              className={`${textareaClass} w-full h-40`}
            />

            <button type="button" onClick={() => setStep(9)} className="mt-8 bg-blue-600 px-8 py-3 rounded-xl hover:bg-blue-700">
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 9 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold">Achievements & Awards</h1>
              <p className="text-slate-400 mt-2">Add notable wins, awards, hackathons, rankings, and recognitions.</p>
            </div>

            <button type="button" onClick={() => setStep(8)} className="bg-slate-800 px-4 py-2 rounded-lg">
              ← Back
            </button>
          </div>

          <div className="w-full bg-slate-800 rounded-full h-3 mb-8">
            <div className="bg-blue-600 h-3 rounded-full w-[90%]"></div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
            <h2 className="text-xl font-semibold mb-6">Step 9 of 10</h2>
            <textarea
              name="achievements"
              value={resumeData.achievements || ""}
              onChange={updateField("achievements")}
              placeholder="Example: Winner, Smart India Hackathon | 1st Place, College Project Expo"
              className={`${textareaClass} w-full h-40`}
            />

            <div className="flex flex-wrap gap-4 mt-8">
              <button type="button" onClick={handleGeneratePreview} className="bg-green-600 px-8 py-3 rounded-xl hover:bg-green-700">
                Generate Resume Preview
              </button>
              <button type="button" onClick={() => setStep(8)} className="bg-slate-800 px-8 py-3 rounded-xl hover:bg-slate-700">
                Back to Leadership
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 10 && (
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-bold">Resume Preview</h1>
              <p className="text-slate-400 mt-2">ATS-friendly placement resume layout.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={() => setStep(9)} className="bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700">
                Edit Resume
              </button>
              <button type="button" onClick={downloadPDF} className="bg-green-600 px-4 py-2 rounded-lg hover:bg-green-700 font-semibold">
                Download PDF
              </button>
            </div>
          </div>

          <div ref={resumeRef} style={{ backgroundColor: "#ffffff", color: "#111827", padding: 32, borderRadius: 16, maxWidth: 900, margin: "0 auto", boxShadow: "0 20px 60px rgba(0,0,0,0.18)", fontFamily: "Arial, Helvetica, sans-serif" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 0.2 }}>{resumeData.name || "Your Name"}</div>
              {[...resumeData.education].reverse().find((education) => education.degree.trim() || education.institution.trim()) && (
                <div style={{ marginTop: 4, fontSize: 16, fontWeight: 600, color: "#1f2937" }}>
                  {joinNonEmpty(
                    [...resumeData.education].reverse().find((education) => education.degree.trim() || education.institution.trim())?.degree,
                    [...resumeData.education].reverse().find((education) => education.degree.trim() || education.institution.trim())?.institution
                  )}
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: 12, color: "#374151", display: "flex", justifyContent: "center", flexWrap: "wrap" }}>
                {[resumeData.email, resumeData.phone, resumeData.linkedin, resumeData.location]
                  .filter(Boolean)
                  .map((item, index, items) => (
                    <span key={`${item}-${index}`} style={{ display: "inline-flex", alignItems: "center" }}>
                      {index > 0 && <span style={{ margin: "0 8px", color: "#6b7280" }}>|</span>}
                      <span>{item}</span>
                    </span>
                  ))}
              </div>
            </div>

            {resumeData.summary.trim() && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Professional Summary</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.7, color: "#111827" }}>{resumeData.summary}</div>
              </div>
            )}

            {resumeData.experiences.some((experience) => experience.company.trim() || experience.role.trim() || experience.duration.trim() || experience.description.trim()) && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Work Experience & Internships</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {resumeData.experiences.map((experience, index) => {
                    if (!experience.company.trim() && !experience.role.trim() && !experience.duration.trim() && !experience.description.trim()) {
                      return null;
                    }

                    const bullets = splitItems(experience.description);

                    return (
                      <div key={index}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                          <span>{joinNonEmpty(experience.role, experience.company)}</span>
                          <span>{experience.duration}</span>
                        </div>
                        {bullets.length > 0 ? (
                          <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 4, fontSize: 12.5, lineHeight: 1.6 }}>
                            {bullets.map((bullet, bulletIndex) => (
                              <li key={bulletIndex}>{bullet}</li>
                            ))}
                          </ul>
                        ) : (
                          experience.description.trim() && <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.6 }}>{experience.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {resumeData.projects.some((project) => project.title.trim() || project.techStack.trim() || project.duration.trim() || project.description.trim()) && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Projects</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {resumeData.projects.map((project, index) => {
                    if (!project.title.trim() && !project.techStack.trim() && !project.duration.trim() && !project.description.trim()) {
                      return null;
                    }

                    const bullets = splitItems(project.description);

                    return (
                      <div key={index}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, fontWeight: 700, color: "#111827" }}>
                          <span>{project.title}</span>
                          <span>{project.duration}</span>
                        </div>
                        {project.techStack.trim() && <div style={{ marginTop: 4, fontSize: 12, color: "#374151", fontWeight: 600 }}>Tech Stack: {project.techStack}</div>}
                        {bullets.length > 0 ? (
                          <ul style={{ margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 4, fontSize: 12.5, lineHeight: 1.6 }}>
                            {bullets.map((bullet, bulletIndex) => (
                              <li key={bulletIndex}>{bullet}</li>
                            ))}
                          </ul>
                        ) : (
                          project.description.trim() && <div style={{ marginTop: 6, fontSize: 12.5, lineHeight: 1.6 }}>{project.description}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(resumeData.technicalSkills.trim() || resumeData.domainSkills.trim() || resumeData.softSkills.trim() || resumeData.languages.trim()) && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Skills</div>
                <div style={{ display: "grid", gap: 8, fontSize: 12.5, lineHeight: 1.6 }}>
                  {resumeData.technicalSkills.trim() && <div><strong>Technical Skills:</strong> {resumeData.technicalSkills}</div>}
                  {resumeData.domainSkills.trim() && <div><strong>Domain Skills:</strong> {resumeData.domainSkills}</div>}
                  {resumeData.softSkills.trim() && <div><strong>Soft Skills:</strong> {resumeData.softSkills}</div>}
                  {resumeData.languages.trim() && <div><strong>Languages:</strong> {resumeData.languages}</div>}
                </div>
              </div>
            )}

            {resumeData.certifications.trim() && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Certifications</div>
                {renderBulletLines(resumeData.certifications) || <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{resumeData.certifications}</div>}
              </div>
            )}

            {resumeData.leadership.trim() && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Leadership / Co-Curricular</div>
                {renderBulletLines(resumeData.leadership) || <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{resumeData.leadership}</div>}
              </div>
            )}

            {resumeData.achievements.trim() && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Achievements & Awards</div>
                {renderBulletLines(resumeData.achievements) || <div style={{ fontSize: 12.5, lineHeight: 1.6 }}>{resumeData.achievements}</div>}
              </div>
            )}

            {resumeData.education.some((education) => education.level.trim() || education.degree.trim() || education.institution.trim() || education.score.trim() || education.year.trim()) && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Education</div>
                <div style={{ display: "grid", gap: 12 }}>
                  {resumeData.education.map((education, index) => {
                    if (!education.level.trim() && !education.degree.trim() && !education.institution.trim() && !education.score.trim() && !education.year.trim()) {
                      return null;
                    }

                    return (
                      <div key={index} style={{ fontSize: 12.5, lineHeight: 1.6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontWeight: 700 }}>
                          <span>{joinNonEmpty(education.level, education.degree)}</span>
                          <span>{education.year}</span>
                        </div>
                        {education.institution.trim() && <div>{education.institution}</div>}
                        {(education.score.trim() || education.level.trim()) && <div>{education.score && <span>CGPA / Percentage: {education.score}</span>}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

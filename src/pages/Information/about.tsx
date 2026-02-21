

export default function AboutSystemPage() {
  return (
    <div className="min-h-screen bg-black text-white p-10">
      <div className="max-w-5xl mx-auto space-y-10">

        <div>
          <h1 className="text-4xl font-bold mb-4">About Auto-Forms</h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Auto-Forms is a document automation system built for the Registrar’s Office
            to streamline the generation of academic documents such as
            Certification, Authentication, and Verification (CAV) forms and
            other registrar-related forms.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">Purpose of the System</h2>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>Reduce manual editing of CAV forms</li>
            <li>Eliminate repetitive data encoding</li>
            <li>Standardize document formatting</li>
            <li>Generate print-ready PDF files instantly</li>
            <li>Track all registrar actions dynamically</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">How It Works</h2>
          <div className="space-y-4 text-gray-400">
            <p>
              <strong>1. Input Data:</strong> Staff enter student details such as
              name, date issued, and document-specific information.
            </p>
            <p>
              <strong>2. Submit Form:</strong> The system validates the input and
              prepares the official document layout.
            </p>
            <p>
              <strong>3. Generate PDF:</strong> The system automatically converts
              the form into a standardized, print-ready PDF file.
            </p>
            <p>
              <strong>4. Archive & Track:</strong> The generated document is saved
              and logged in the audit system.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-3">Supported Documents</h2>
          <ul className="list-disc list-inside text-gray-400 space-y-2">
            <li>Certification, Authentication, and Verification (CAV)</li>
            <li>Academic Certifications</li>
            <li>Verification Letters</li>
            <li>Custom Registrar Forms</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
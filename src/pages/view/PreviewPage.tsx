import { useNavigate, useParams } from "react-router-dom"

function ViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="p-6">
      <button
        onClick={() => navigate("/")}
        className="mb-4 rounded bg-gray-200 px-3 py-1"
      >
      </button>

      <h1 className="text-2xl font-bold">View Page</h1>
      <p>Viewing item with ID: {id}</p>
    </div>
  )
}
export default ViewPage
import { useParams } from "react-router-dom"
import CAV from "./CAV/cav"

function FormRouter() {
  const { formType } = useParams()

  switch (formType) {
    case "cav":
      return <CAV />
      
    default:
      return <div>Form not found</div>
  }
}

export default FormRouter
import { useParams } from "react-router-dom"
import CAV from "./CAV/cav"
import CAVK12 from "./CAV/cav-k12"

function FormRouter() {
  const { formType } = useParams()

  switch (formType) {
    case "cav":
      return <CAV />
    case "cavk12":
    return <CAVK12 />  
    default:
      return <div>Form not found</div>
  }
}

export default FormRouter
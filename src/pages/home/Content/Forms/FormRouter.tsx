import { useParams } from "react-router-dom"
import CAV from "./CAV/cav"
import SF10 from "./SF10/sf10"

function FormRouter() {
  const { formType } = useParams()

  switch (formType) {
    case "cav":
      return <CAV />
    case "sf10":
      return <SF10 />
    default:
      return <div>Form not found</div>
  }
}

export default FormRouter
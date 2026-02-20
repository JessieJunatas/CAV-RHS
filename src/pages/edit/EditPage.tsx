import { useParams,useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"

function EditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-10">
      <div className="w-full max-w-7xl rounded-2xl border border-zinc-800 p-10">
        
        <button
        onClick={() => navigate("/")}
        className="mb-4 rounded bg-gray-200 px-3 py-1"
        >
        </button>
        
        <div className="mb-8 text-white">
          <h1 className="text-2xl font-bold">Edit Form</h1>
          <p className="text-sm text-zinc-400">
            Editing item with ID: {id}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-16">
          
          {/* LEFT SIDE - FORM */}
          <Card className="p-8 rounded-2xl bg-zinc-100 text-black">
            <div className="grid grid-cols-2 gap-6">
              
              <div>
                <label className="text-sm font-medium">Complete Name</label>
                <Input placeholder="Complete Name" />
              </div>

              <div>
                <label className="text-sm font-medium">Date Issued</label>
                <Input placeholder="Date Issued" />
              </div>

              <div>
                <label className="text-sm font-medium">Name of School</label>
                <Input placeholder="Name of School" />
              </div>

              <div>
                <label className="text-sm font-medium">School Year Completed</label>
                <Input placeholder="School Year Completed" />
              </div>

              <div>
                <label className="text-sm font-medium">School Address</label>
                <Input placeholder="School Address" />
              </div>

              <div>
                <label className="text-sm font-medium">Date of Application</label>
                <Input placeholder="Date of Application" />
              </div>

              <div>
                <label className="text-sm font-medium">School Year Graduated</label>
                <Input placeholder="School Year Graduated" />
              </div>

              <div>
                <label className="text-sm font-medium">Control No.</label>
                <Input placeholder="Control No." />
              </div>

              <div className="col-span-2 flex justify-end pt-4">
                <Button>Update</Button>
              </div>

            </div>
          </Card>

          {/* RIGHT SIDE - PREVIEW */}
          <Card className="flex items-center justify-center p-10 rounded-2xl bg-zinc-100">
            <div className="flex flex-col items-center gap-6">
              
              <div className="relative w-[320px] h-[160px] rounded-xl overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 flex items-center justify-center">
                <span className="text-white font-semibold">
                  PREVIEW
                </span>
              </div>

              <div className="flex gap-3">
                <div className="w-4 h-4 rounded-full bg-zinc-400" />
                <div className="w-4 h-4 rounded-full bg-zinc-300" />
                <div className="w-4 h-4 rounded-full bg-zinc-300" />
                <div className="w-4 h-4 rounded-full bg-zinc-300" />
              </div>

            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}

export default EditPage
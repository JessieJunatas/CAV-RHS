import { Dialog, DialogContent } from "@/components/ui/dialog"
//import ViewDialog from "@/components/view-dialog"

function ViewModal({ isOpen, onClose}: { isOpen: boolean; onClose: () => void; record: any }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>

    

      </DialogContent>
    </Dialog>
  )
}

export default ViewModal  
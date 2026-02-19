import { useEffect, useState } from "react";
import {MoveRight} from "lucide-react";
import SearchCommand from "@/components/search";

function HeroSection() {
    const [commitMessage, setCommitMessage] = useState("");

    useEffect(() => {
    fetch("https://api.github.com/repos/JessieJunatas/CAV-RHS/commits?per_page=1")
        .then((res) => res.json())
        .then((data) => {
        setCommitMessage(data[0].commit.message);
        })
        .catch(() => {
        setCommitMessage("Recently updated");
        });
    }, []);


  return (
    <div className="pt-16 text-center flex flex-col items-center gap-4">
      <a
        href="https://github.com/JessieJunatas/CAV-RHS"
        className="inline-flex items-center gap-1 rounded-full border px-3 text-sm text-foreground hover:bg-muted transition"
      >
        {commitMessage} <MoveRight className="size-4"/>
      </a>

      <h1 className="text-5xl font-semibold">
        Automate Your Document Workflow
      </h1>

      <p className="text-lg max-w-2xl">
        A system designed to automatically extract and input data to school documents,
        improving efficiency while reducing manual data entry.
      </p>
      <div className="py-5">
        <SearchCommand/>
      </div>
    </div>
  );
}

export default HeroSection;

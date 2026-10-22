import { useEffect, useState } from "react";
import API from "../api";

/* Which marking option (1, 2, 3 or 4) the admin picked for the signed-in teacher.
   Option 1 is the default and is used while loading or if the call fails. */
export default function useMarkingOption() {
  const [option, setOption] = useState(1);
  useEffect(() => {
    let alive = true;
    API.get("/e-assessments/marking-option")
      .then((r) => { const n = Number(r?.data?.option); if (alive && (n === 2 || n === 3 || n === 4)) setOption(n); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return option;
}

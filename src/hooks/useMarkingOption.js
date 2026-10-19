import { useEffect, useState } from "react";
import API from "../api";

/* Which marking option (1 or 2) the admin picked for the signed-in teacher.
   Option 1 is the default and is used while loading or if the call fails. */
export default function useMarkingOption() {
  const [option, setOption] = useState(1);
  useEffect(() => {
    let alive = true;
    API.get("/e-assessments/marking-option")
      .then((r) => { if (alive && Number(r?.data?.option) === 2) setOption(2); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return option;
}

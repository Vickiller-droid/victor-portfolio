import { BoothyMockup, GoMockup, AsciiMockup, VicFungoMockup } from "./ProjectMockups";
export default function ProjectPreview({ variant }) {
  return variant === "boothy" ? <BoothyMockup/> : variant === "go" ? <GoMockup/> : variant === "ascii" ? <AsciiMockup/> : <VicFungoMockup/>;
}

import { ImageResponse } from "next/og";
export const alt = "Victor Alabi Daniel — Software Developer. Thoughtful software. Practical solutions.";
export const size = {width:1200,height:630};
export const contentType = "image/png";
export default function OpenGraphImage(){return new ImageResponse(<div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",width:"100%",height:"100%",padding:"70px",background:"#211f1c",color:"#f6f3ee",fontFamily:"sans-serif"}}><div style={{display:"flex",fontSize:28,color:"#e59a7b"}}>VICTOR ALABI DANIEL / SOFTWARE DEVELOPER</div><div style={{display:"flex",flexDirection:"column",fontSize:79,lineHeight:1.1,letterSpacing:-4}}><span>Thoughtful software.</span><span style={{color:"#e59a7b"}}>Practical solutions.</span></div><div style={{display:"flex",fontSize:25,color:"#c0b5a8"}}>Go foundations · Web prototypes · Abuja, Nigeria</div></div>,size)}

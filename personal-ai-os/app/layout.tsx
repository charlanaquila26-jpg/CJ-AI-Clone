import './style.css';import type {Metadata} from 'next';
export const metadata:Metadata={title:'Personal AI OS',description:'Private AI chief of staff'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}

import { redirect } from "next/navigation";

export async function generateStaticParams() {
    return [{ lang: 'es' }];
}

export default function Empty() { 
    redirect("/"); 
}

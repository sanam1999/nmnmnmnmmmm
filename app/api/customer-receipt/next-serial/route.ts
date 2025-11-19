import { NextResponse } from "next/server";
import {prisma} from "../../../libs/prisma"

export async function GET() {
    
    try{

        const last = await prisma.customerReceipt.findFirst({
            orderBy:{serialNumber:"desc"}
        });

        let nextNumber = 1;

        if (last?.serialNumber){
            const num=parseInt(last.serialNumber,10);

            if(!isNaN(num)) nextNumber=num+1;
        }

        const formatted = String(nextNumber).padStart(3,"0");

        return NextResponse.json({nextSerial:formatted})

    }
    catch(err){
        console.error(err)

        return NextResponse.json(
            {error:"Failed to fetch next serial"},
            {status:500}
        )
    }
}
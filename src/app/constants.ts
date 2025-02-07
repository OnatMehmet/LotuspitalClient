
import { GenderModel } from "./models/patient.model"
import { DepartmentModel } from "./models/personnel.model"

export const api: string  ="https://localhost:7157/api" //canlıya alınınca değişecek

export const departments : DepartmentModel[] =  [
    {
        value:1,
        name:"Acil"
    },
    {
        value:2,
        name:"Kardiyoloji"
    },
    {
        value:3,
        name:"Radyoloji"
    },
    {
        value:4,
        name:"Nefroloji"
    },
    {
        value:5,
        name:"Nöroloji"
    },
    {
        value:6,
        name:"Psikiyatri"
    },
]


export const genders : GenderModel[] =  [
    {
        value:1,
        name:"Erkek"
    },
    {
        value:2,
        name:"Kadın"
    },
    {
        value:3,
        name:"Belirtmek İstemiyorum"
    }

]
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const dataFilePath = path.join(process.cwd(), 'data', 'guardias.json');

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
}

export async function GET() {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      return NextResponse.json(JSON.parse(data));
    } else {
      const defaultData = [
        {
          id: "1",
          item: 1,
          weekDaysText: "SEMANA DEL 27 AL 01/05",
          weekCallCenterText: "",
          weekCallCenterPerson: "",
          weekSoporteText: "",
          weekSoportePerson: "",
          isSpecial: true,
          specialTitle: "VIERNES 1° DE MAYO DIA DEL TRABAJADOR",
          specialHeader: "CC Y MONITOREO - VIERNES 08:00 AM A 08:00PM",
          specialCallCenter: "GEORGINA BALADI",
          specialMonitoreo: "HENYERBERT ARRIECHE",
          specialSoporte: "CARLOS OVALLES / ARNALDO ROJAS",
          specialAgencia: "CERRADO",
          weekendText: "CC Y MONITOREO SABADO - DOMINGO 08:00 AM A 08:00PM",
          weekendCallCenterPerson: "DERWING ACEVEDO",
          weekendMonitoreoPerson: "SANDY RODRIGUEZ",
          weekendSoportePerson: "DARIO PEDROZA / YERALD GOMEZ",
          weekendAgenciaPerson: "MARTHA PINTO",
          fechaText: "SABADO DOMINGO 2-3/05"
        },
        {
          id: "2",
          item: 2,
          weekDaysText: "SEMANA DEL 04 AL 08/05",
          weekCallCenterText: "CALL CENTER 5:00 PM A 8:00 PM",
          weekCallCenterPerson: "MARTHA PINTO",
          weekSoporteText: "SOPORTE TECNICO 8:00 AM A 8:00 PM",
          weekSoportePerson: "JONATHAN / KELVIN",
          isSpecial: false,
          weekendText: "CC Y MONITOREO SABADO - DOMINGO 08:00 AM A 08:00PM",
          weekendCallCenterPerson: "GEORGINA BALADI",
          weekendMonitoreoPerson: "HENYERBERT ARRIECHE",
          weekendSoportePerson: "JEAN MORALES / KELVIN SANCHEZ",
          weekendAgenciaPerson: "YHOSSELLYN PEREZ",
          fechaText: "SABADO DOMINGO 9-10/05"
        },
        {
          id: "3",
          item: 3,
          weekDaysText: "SEMANA DEL 11 AL 15/05",
          weekCallCenterText: "CALL CENTER 5:00 PM A 8:00 PM",
          weekCallCenterPerson: "DERWING ACEVEDO",
          weekSoporteText: "SOPORTE TECNICO 8:00 AM A 8:00 PM",
          weekSoportePerson: "JONATHAN / KELVIN",
          isSpecial: false,
          weekendText: "CC Y MONITOREO SABADO - DOMINGO 08:00 AM A 08:00PM",
          weekendCallCenterPerson: "YHOSSELLYN PEREZ",
          weekendMonitoreoPerson: "SANDY RODRIGUEZ",
          weekendSoportePerson: "JONATHAN GARCIA / ARNALDO ROJAS",
          weekendAgenciaPerson: "GEORGINA BALADI",
          fechaText: "SABADO DOMINGO 16-17/05"
        },
        {
          id: "4",
          item: 4,
          weekDaysText: "SEMANA DEL 18 AL 22/05",
          weekCallCenterText: "CALL CENTER 5:00 PM A 8:00 PM",
          weekCallCenterPerson: "GEORGINA BALADI",
          weekSoporteText: "SOPORTE TECNICO 1:00 PM A 8:00 PM",
          weekSoportePerson: "JONATHAN",
          isSpecial: false,
          weekendText: "CC Y MONITOREO SABADO - DOMINGO 08:00 AM A 08:00PM",
          weekendCallCenterPerson: "MARTHA PINTO",
          weekendMonitoreoPerson: "HENYERBERT ARRIECHE",
          weekendSoportePerson: "CARLOS OVALLES / DARIO PEDROZA",
          weekendAgenciaPerson: "KHALOA SERRANO",
          fechaText: "SABADO DOMINGO 23-24/05"
        },
        {
          id: "5",
          item: 5,
          weekDaysText: "SEMANA DEL 25 AL 29/05",
          weekCallCenterText: "CALL CENTER 5:00 PM A 8:00 PM",
          weekCallCenterPerson: "KHALOA SERRANO",
          weekSoporteText: "SOPORTE TECNICO 1:00 PM A 8:00 PM",
          weekSoportePerson: "KELVIN",
          isSpecial: false,
          weekendText: "CC Y MONITOREO SABADO - DOMINGO 08:00 AM A 08:00PM",
          weekendCallCenterPerson: "KHALOA SERRANO",
          weekendMonitoreoPerson: "SANDY RODRIGUEZ",
          weekendSoportePerson: "JEAN MORALES / YERALD GOMEZ",
          weekendAgenciaPerson: "YHOSSELLYN PEREZ",
          fechaText: "SABADO DOMINGO 30-31/05"
        }
      ];
      return NextResponse.json(defaultData);
    }
  } catch (error) {
    console.error("Error reading guardias data:", error);
    return NextResponse.json({ error: 'Failed to read data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    ensureDirectoryExistence(dataFilePath);
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving guardias data:", error);
    return NextResponse.json({ error: 'Failed to save data' }, { status: 500 });
  }
}

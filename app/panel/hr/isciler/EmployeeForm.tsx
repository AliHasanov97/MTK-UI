"use client";

import { toDateInput, type EmployeeDetail, type EmployeeForm } from "../../../lib/api/hr";

export function emptyEmployeeForm(): EmployeeForm {
  return {
    name: "",
    surname: "",
    fathersName: "",
    gender: 1,
    startWorkDate: "",
    jobId: "",
    nationality: "",
    birthDate: "",
    finCode: "",
    idCardNumber: "",
    socialSecurityNumber: "",
    contractNumber: "",
    salaryBankName: "",
    employeeBankAccountNumber: "",
    maritalStatus: "",
    numberOfChildren: "",
    childrenUnder14Count: "",
    militaryService: "",
    veteran: false,
    disability: false,
    isKarabakhWorker: false,
    isSingleParent: false,
    hasDisabledChild: false,
    education: "",
    phoneNumber: "",
    homePhoneNumber: "",
    email: "",
    registeredAddress: "",
    currentAddress: "",
    workingDays: "1",
    vacationDays: "21",
    employmentType: 1,
    isActive: 1,
  };
}

const text = (v: string | null | undefined) => v ?? "";
const numText = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function employeeToForm(e: EmployeeDetail): EmployeeForm {
  return {
    name: e.name,
    surname: e.surname,
    fathersName: e.fathersName,
    gender: e.gender,
    startWorkDate: toDateInput(e.startWorkDate),
    jobId: e.job?.id ?? "",
    nationality: text(e.nationality),
    birthDate: toDateInput(e.birthDate),
    finCode: text(e.finCode),
    idCardNumber: text(e.idCardNumber),
    socialSecurityNumber: text(e.socialSecurityNumber),
    contractNumber: text(e.contractNumber),
    salaryBankName: text(e.salaryBankName),
    employeeBankAccountNumber: text(e.employeeBankAccountNumber),
    maritalStatus: numText(e.maritalStatus),
    numberOfChildren: numText(e.numberOfChildren),
    childrenUnder14Count: numText(e.childrenUnder14Count),
    militaryService: numText(e.militaryService),
    veteran: e.veteran,
    disability: e.disability,
    isKarabakhWorker: e.isKarabakhWorker,
    isSingleParent: e.isSingleParent,
    hasDisabledChild: e.hasDisabledChild,
    education: numText(e.education),
    phoneNumber: text(e.phoneNumber),
    homePhoneNumber: text(e.homePhoneNumber),
    email: text(e.email),
    registeredAddress: text(e.registeredAddress),
    currentAddress: text(e.currentAddress),
    workingDays: numText(e.workingDays),
    vacationDays: numText(e.vacationDays),
    employmentType: e.employmentType,
    isActive: e.isActive,
  };
}

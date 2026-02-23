"use client"

import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/auth"

export interface InvoiceHealthData {
  totalInvoiced: number
  paidTotal: number
  outstandingTotal: number
  overdueTotal: number
  overdueCount: number
  invoiceCount: number
}

const parseNum = (v: any) => parseFloat(String(v)) || 0

export const useInvoiceHealth = () => {
  return useQuery({
    queryKey: ["invoice-health"],
    queryFn: async (): Promise<InvoiceHealthData> => {
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString().split("T")[0]
      const today = now.toISOString().split("T")[0]

      // Fetch both internal invoices and QBO synced invoices
      const [localRes, qboRes] = await Promise.all([
        supabase.from("campaign_invoices")
          .select("id, amount, status, due_date, paid_date, issued_date, qbo_invoice_id, qbo_sync_status"),
        supabase.from("qbo_invoices")
          .select("id, total_amt, balance, due_date, txn_date, campaign_invoice_id"),
      ])

      const localInvoices: any[] = localRes.data || []
      const qboInvoices: any[] = qboRes.data || []

      // Build QBO lookup for enrichment
      const qboMap = new Map<string, any>()
      for (const q of qboInvoices) {
        if (q.campaign_invoice_id) qboMap.set(q.campaign_invoice_id, q)
      }

      // Use campaign_invoices as the primary source. If synced to QBO, use QBO
      // balance to determine paid/outstanding more accurately.
      let totalInvoiced = 0
      let paidTotal = 0
      let outstandingTotal = 0
      let overdueTotal = 0
      let overdueCount = 0

      for (const inv of localInvoices) {
        const amount = parseNum(inv.amount)
        const status = (inv.status || "").toLowerCase()
        const issuedDate = inv.issued_date || inv.created_at || ""
        const dueDate = inv.due_date || ""

        // Count towards current month invoiced total if issued this month
        if (issuedDate >= monthStart) {
          totalInvoiced += amount
        }

        // Determine paid status: prefer QBO balance when synced
        const qboEntry = qboMap.get(inv.id)
        let isPaid = status === "paid"
        let balance = amount

        if (qboEntry && inv.qbo_sync_status === "synced") {
          balance = parseNum(qboEntry.balance)
          isPaid = balance <= 0
        }

        if (isPaid) {
          paidTotal += amount
        } else {
          outstandingTotal += (qboEntry ? balance : amount)
          if (dueDate && dueDate < today) {
            overdueTotal += (qboEntry ? balance : amount)
            overdueCount++
          }
        }
      }

      // Also count QBO-only invoices (not linked to campaign_invoices)
      const linkedQboIds = new Set(localInvoices.map(inv => inv.id))
      for (const q of qboInvoices) {
        if (q.campaign_invoice_id && linkedQboIds.has(q.campaign_invoice_id)) continue
        const amount = parseNum(q.total_amt)
        const balance = parseNum(q.balance)
        const txnDate = q.txn_date || ""
        const dueDate = q.due_date || ""

        if (txnDate >= monthStart) {
          totalInvoiced += amount
        }

        if (balance <= 0) {
          paidTotal += amount
        } else {
          outstandingTotal += balance
          if (dueDate && dueDate < today) {
            overdueTotal += balance
            overdueCount++
          }
        }
      }

      return {
        totalInvoiced,
        paidTotal,
        outstandingTotal,
        overdueTotal,
        overdueCount,
        invoiceCount: localInvoices.length + qboInvoices.filter(q =>
          !q.campaign_invoice_id || !linkedQboIds.has(q.campaign_invoice_id)
        ).length,
      }
    },
    staleTime: 3 * 60 * 1000,
  })
}

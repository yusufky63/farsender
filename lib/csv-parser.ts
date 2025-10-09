import { CSVRow } from '@/types'

export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  // Detect delimiter (comma or semicolon)
  const firstLine = lines[0]
  const hasComma = firstLine.includes(',')
  const hasSemicolon = firstLine.includes(';')
  const delimiter = hasSemicolon ? ';' : ','
  
  // If no header, assume first column is address, second is amount
  if (!hasComma && !hasSemicolon) {
    // Simple format: one address per line
    return lines.map(line => ({ address: line.trim() }))
  }
  
  // Parse header if exists
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase())
  
  // Find address and amount columns
  const addressIndex = headers.findIndex(h => 
    h.includes('address') || h.includes('adres') || h.includes('wallet')
  )
  const amountIndex = headers.findIndex(h => 
    h.includes('amount') || h.includes('miktar') || h.includes('value')
  )
  
  // If no header found, assume first column is address, second is amount
  const startRow = addressIndex === -1 ? 0 : 1
  const addrIdx = addressIndex === -1 ? 0 : addressIndex
  const amtIdx = amountIndex === -1 ? 1 : amountIndex
  
  // Parse data rows
  const rows: CSVRow[] = []
  for (let i = startRow; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim())
    
    if (values.length <= addrIdx) continue
    
    const row: CSVRow = {
      address: values[addrIdx]
    }
    
    if (amtIdx !== -1 && values[amtIdx] && values[amtIdx] !== '') {
      row.amount = values[amtIdx]
    }
    
    rows.push(row)
  }
  
  return rows
}

export function validateCSVFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      reject(new Error('Sadece CSV dosyaları desteklenir'))
      return
    }
    
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      reject(new Error('Dosya boyutu 5MB\'dan küçük olmalı'))
      return
    }
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string
        const rows = parseCSV(csvText)
        
        if (rows.length === 0) {
          reject(new Error('CSV dosyası boş veya geçersiz'))
          return
        }
        
        if (rows.length > 300) {
          reject(new Error('Maksimum 300 satır desteklenir'))
          return
        }
        
        resolve(csvText)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Dosya okunamadı'))
    }
    
    reader.readAsText(file)
  })
}

export function downloadCSV(data: CSVRow[], filename: string = 'recipients.csv'): void {
  const headers = ['address', 'amount']
  const csvContent = [
    headers.join(','),
    ...data.map(row => [row.address, row.amount || ''].join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

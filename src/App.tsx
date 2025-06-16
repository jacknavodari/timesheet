import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Calendar,
  TrendingUp,
  Clock,
  Trash2,
  Calculator,
  Percent
} from 'lucide-react';

interface DayData {
  normal: number;
  ot50: number;
  ot100: number;
}

interface TimesheetData {
  hourlyRate: number;
  hours: Record<string, DayData>;
  taxRate: number;
  currency: string;
}

const STORAGE_KEY = 'timesheetData';
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
];

function App() {
  const [currentMonday, setCurrentMonday] = useState<Date>(getStartOfWeek(new Date()));
  const [timeData, setTimeData] = useState<TimesheetData>({
    hourlyRate: 0,
    hours: {},
    taxRate: 0,
    currency: 'USD'
  });
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');

  const importData = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/json';

    fileInput.addEventListener('change', (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];

      if (!file) {
        displayMessage('No file selected');
        return;
      }

      const reader = new FileReader();

      reader.addEventListener('load', (event: ProgressEvent<FileReader>) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          setTimeData(data);
          saveData(data);
          displayMessage('Data imported successfully');
        } catch (error) {
          console.error('Error parsing JSON:', error);
          displayMessage('Error importing data: Invalid JSON file');
        }
      });

      reader.readAsText(file);
    });

    fileInput.click();
  };

  const exportData = () => {
    const dataStr = JSON.stringify(timeData);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const dataUrl = URL.createObjectURL(dataBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = dataUrl;
    downloadLink.download = 'timesheet-data.json';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    URL.revokeObjectURL(dataUrl);
  };

  // Utility functions
  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  }

  const formatDate = useCallback((date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  function formatDateShort(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatDateRange(startDate: Date): string {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const startStr = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    if (startDate.getFullYear() !== endDate.getFullYear()) {
      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${endStr}`;
    }
    return `${startStr} - ${endStr}`;
  }

  const displayMessage = useCallback((msg: string) => {
    setMessage(msg);
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 3000);
  }, []);

  // Data handling
  const loadData = (): TimesheetData => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const parsedData = data ? JSON.parse(data) : {};
      return {
        hourlyRate: parsedData.hourlyRate || 0,
        hours: typeof parsedData.hours === 'object' && parsedData.hours !== null ? parsedData.hours : {},
        taxRate: parsedData.taxRate || 0,
        currency: parsedData.currency || 'USD'
      };
    } catch (e) {
      console.error('Error parsing localStorage data:', e);
      displayMessage('Could not load saved data. Starting fresh.');
      localStorage.removeItem(STORAGE_KEY);
      return { hourlyRate: 0, hours: {}, taxRate: 0, currency: 'USD' };
    }
  };

  const saveData = (data: TimesheetData) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      displayMessage('Could not save data. Storage might be full.');
    }
  };

  // Get current currency
  const currentCurrency = currencies.find(c => c.code === timeData.currency) || currencies[0];

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const rate = timeData.hourlyRate || 0;
    let weekTotal = 0;
    let monthTotal = 0;
    let yearTotal = 0;

    const currentMonth = currentMonday.getMonth();
    const currentYear = currentMonday.getFullYear();

    // Week total
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(currentMonday);
      dayDate.setDate(currentMonday.getDate() + i);
      const dateKey = formatDate(dayDate);
      const dayData = timeData.hours[dateKey];
      if (dayData) {
        weekTotal += (dayData.normal * rate) + (dayData.ot50 * rate * 1.5) + (dayData.ot100 * rate * 2.0);
      }
    }

    // Month and year totals
    for (const dateKey in timeData.hours) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;

      const dayData = timeData.hours[dateKey];
      if (!dayData) continue;

      const entryDate = new Date(`${dateKey}T00:00:00`);
      if (Number.isNaN(entryDate.getTime())) continue;

      const dailyTotal = (dayData.normal * rate) + (dayData.ot50 * rate * 1.5) + (dayData.ot100 * rate * 2.0);

      if (entryDate.getFullYear() === currentYear) {
        yearTotal += dailyTotal;
        if (entryDate.getMonth() === currentMonth) {
          monthTotal += dailyTotal;
        }
      }
    }

    // Calculate tax amounts
    const taxRate = timeData.taxRate / 100;
    const weekTax = weekTotal * taxRate;
    const monthTax = monthTotal * taxRate;
    const yearTax = yearTotal * taxRate;

    return {
      weekTotal,
      monthTotal,
      yearTotal,
      weekNet: weekTotal - weekTax,
      monthNet: monthTotal - monthTax,
      yearNet: yearTotal - yearTax,
      weekTax,
      monthTax,
      yearTax
    };
  }, [timeData, currentMonday, formatDate]);

  // Handle input changes
  const handleHourChange = (dateKey: string, type: keyof DayData, value: string) => {
    const numValue = Number.parseFloat(value) || 0;

    if (numValue < 0) {
      displayMessage('Hours cannot be negative');
      return;
    }

    setTimeData(prev => {
      const newData = { ...prev };

      if (!newData.hours[dateKey]) {
        newData.hours[dateKey] = { normal: 0, ot50: 0, ot100: 0 };
      }

      newData.hours[dateKey][type] = numValue;

      // Remove entry if all hours are zero
      const dayEntry = newData.hours[dateKey];
      if (dayEntry.normal === 0 && dayEntry.ot50 === 0 && dayEntry.ot100 === 0) {
        delete newData.hours[dateKey];
      }

      saveData(newData);
      return newData;
    });
  };

  const handleRateChange = (value: string) => {
    const rateValue = Number.parseFloat(value) || 0;
    if (rateValue < 0) {
      displayMessage('Hourly rate cannot be negative');
      return;
    }

    setTimeData(prev => {
      const newData = { ...prev, hourlyRate: rateValue };
      saveData(newData);
      return newData;
    });
  };

  const handleTaxRateChange = (value: string) => {
    const taxValue = Number.parseFloat(value) || 0;
    if (taxValue < 0 || taxValue > 100) {
      displayMessage('Tax rate must be between 0% and 100%');
      return;
    }

    setTimeData(prev => {
      const newData = { ...prev, taxRate: taxValue };
      saveData(newData);
      return newData;
    });
  };

  const handleCurrencyChange = (value: string) => {
    setTimeData(prev => {
      const newData = { ...prev, currency: value };
      saveData(newData);
      return newData;
    });
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear ALL saved timesheet data? This cannot be undone.')) {
      localStorage.removeItem(STORAGE_KEY);
      setTimeData({ hourlyRate: 0, hours: {}, taxRate: 0, currency: 'USD' });
      displayMessage('All saved data has been cleared');
    }
  };

  // Navigation
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentMonday(prev => {
      const newMonday = new Date(prev);
      newMonday.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newMonday;
    });
  };

  // Initialize data
  // biome-ignore lint/correctness/useExhaustiveDependencies: loadData should only run once on mount
  useEffect(() => {
    setTimeData(loadData());
  }, []);

  const totals = calculateTotals();

  const formatCurrency = (amount: number) => {
    const symbol = currentCurrency.symbol;
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (timeData.currency === 'RON') {
      return `${formatted} ${symbol}`;
    }
    return `${symbol}${formatted}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-4 md:p-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Timesheet
          </h1>
          <p className="text-lg text-slate-600">Track your hours with style</p>
        </div>

        {/* Configuration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Hourly Rate Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-r from-white to-slate-50 card-hover">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-700">
                <DollarSign className="h-5 w-5 text-green-600 animate-float" />
                Hourly Rate & Currency
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">{currentCurrency.symbol}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={timeData.hourlyRate || ''}
                  onChange={(e) => handleRateChange(e.target.value)}
                  className="text-xl font-semibold border-2 focus:border-green-500 w-32 input-focus-glow transition-all duration-300"
                />
                <span className="text-slate-500">/hour</span>
              </div>
              <Select value={timeData.currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name} ({currency.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Tax Calculator Card */}
          <Card className="border-0 shadow-xl bg-gradient-to-r from-white to-slate-50 card-hover">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-slate-700">
                <Calculator className="h-5 w-5 text-blue-600 animate-float" />
                Tax Calculator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-blue-600" />
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="0"
                  value={timeData.taxRate || ''}
                  onChange={(e) => handleTaxRateChange(e.target.value)}
                  className="text-xl font-semibold border-2 focus:border-blue-500 w-24 input-focus-glow transition-all duration-300"
                />
                <span className="text-slate-500">% tax rate</span>
              </div>
              <p className="text-sm text-slate-600 mt-2">
                Example: 500 gross with 50% tax = 250 net
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Week Navigation */}
        <Card className="mb-8 border-0 shadow-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white card-hover overflow-hidden relative">
          <div className="absolute inset-0 shimmer opacity-20" />
          <CardContent className="p-6 relative">
            <div className="flex justify-between items-center">
              <Button
                variant="secondary"
                onClick={() => navigateWeek('prev')}
                className="bg-white/20 hover:bg-white/30 text-white border-0 transition-all duration-300 hover:scale-105"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Previous Week
              </Button>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Calendar className="h-5 w-5 animate-float" />
                  <span className="text-sm font-medium opacity-90">Week of</span>
                </div>
                <h2 className="text-xl font-bold">{formatDateRange(currentMonday)}</h2>
              </div>

              <Button
                variant="secondary"
                onClick={() => navigateWeek('next')}
                className="bg-white/20 hover:bg-white/30 text-white border-0 transition-all duration-300 hover:scale-105"
              >
                Next Week
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timesheet Table */}
        <Card className="mb-8 border-0 shadow-xl overflow-hidden card-hover">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b">
            <CardTitle className="flex items-center gap-2 text-slate-700">
              <Clock className="h-5 w-5 text-blue-600 animate-float" />
              Daily Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-semibold text-slate-700">Day</th>
                    <th className="text-left p-4 font-semibold text-slate-700">Date</th>
                    <th className="text-left p-4 font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        Regular Hours
                        <Badge variant="secondary" className="bg-green-100 text-green-700">1.0x</Badge>
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        Overtime 1.5x
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700">1.5x</Badge>
                      </div>
                    </th>
                    <th className="text-left p-4 font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        Overtime 2.0x
                        <Badge variant="secondary" className="bg-red-100 text-red-700">2.0x</Badge>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 7 }, (_, i) => {
                    const currentDayDate = new Date(currentMonday);
                    currentDayDate.setDate(currentMonday.getDate() + i);
                    const dateKey = formatDate(currentDayDate);
                    const dayData = timeData.hours[dateKey] || { normal: 0, ot50: 0, ot100: 0 };

                    return (
                      <tr key={dateKey} className={`border-b hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-25'}`}>
                        <td className="p-4 font-medium text-slate-700">{daysOfWeek[i]}</td>
                        <td className="p-4 text-slate-600">{formatDateShort(currentDayDate)}</td>
                        <td className="p-4">
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0"
                            value={dayData.normal || ''}
                            onChange={(e) => handleHourChange(dateKey, 'normal', e.target.value)}
                            className="w-24 border-green-200 focus:border-green-500 input-focus-glow transition-all duration-300"
                          />
                        </td>
                        <td className="p-4">
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0"
                            value={dayData.ot50 || ''}
                            onChange={(e) => handleHourChange(dateKey, 'ot50', e.target.value)}
                            className="w-24 border-orange-200 focus:border-orange-500 input-focus-glow transition-all duration-300"
                          />
                        </td>
                        <td className="p-4">
                          <Input
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="0"
                            value={dayData.ot100 || ''}
                            onChange={(e) => handleHourChange(dateKey, 'ot100', e.target.value)}
                            className="w-24 border-red-200 focus:border-red-500 input-focus-glow transition-all duration-300"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards - Gross Earnings */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Gross Earnings
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white overflow-hidden card-hover transform transition-all duration-500">
              <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 animate-float" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 animate-float" />
                    <span className="text-sm font-medium opacity-90">This Week</span>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(totals.weekTotal)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-500 to-purple-600 text-white overflow-hidden card-hover transform transition-all duration-500 delay-100">
              <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 animate-float" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 animate-float" />
                    <span className="text-sm font-medium opacity-90">This Month</span>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(totals.monthTotal)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-500 to-green-600 text-white overflow-hidden card-hover transform transition-all duration-500 delay-200">
              <CardContent className="p-6 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 animate-float" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 animate-float" />
                    <span className="text-sm font-medium opacity-90">This Year</span>
                  </div>
                  <p className="text-3xl font-bold">{formatCurrency(totals.yearTotal)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Net Earnings (After Tax) */}
        {timeData.taxRate > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Net Earnings (After {timeData.taxRate}% Tax)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-0 shadow-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white overflow-hidden card-hover transform transition-all duration-500">
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 animate-float" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 animate-float" />
                      <span className="text-sm font-medium opacity-90">Week Net</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totals.weekNet)}</p>
                    <p className="text-sm opacity-75">Tax: {formatCurrency(totals.weekTax)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white overflow-hidden card-hover transform transition-all duration-500 delay-100">
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 animate-float" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 animate-float" />
                      <span className="text-sm font-medium opacity-90">Month Net</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totals.monthNet)}</p>
                    <p className="text-sm opacity-75">Tax: {formatCurrency(totals.monthTax)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white overflow-hidden card-hover transform transition-all duration-500 delay-200">
                <CardContent className="p-6 relative">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 animate-float" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 animate-float" />
                      <span className="text-sm font-medium opacity-90">Year Net</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(totals.yearNet)}</p>
                    <p className="text-sm opacity-75">Tax: {formatCurrency(totals.yearTax)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="text-center">
          <Button
            variant="destructive"
            onClick={clearAllData}
            className="bg-red-500 hover:bg-red-600 transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All Data
          </Button>
          <Button
            variant="secondary"
            onClick={exportData}
            className="bg-green-500 hover:bg-green-600 transition-all duration-300 hover:scale-105 hover:shadow-lg ml-4"
          >
            Export Data
          </Button>
          <Button
            variant="secondary"
            onClick={importData}
            className="bg-blue-500 hover:bg-blue-600 transition-all duration-300 hover:scale-105 hover:shadow-lg ml-4"
          >
            Import Data
          </Button>
        </div>

        {/* Message Toast */}
        {showMessage && (
          <div className="fixed bottom-4 right-4 bg-red-500 text-white p-4 rounded-lg shadow-xl animate-in slide-in-from-bottom-2 z-50">
            <div className="flex items-center gap-2">
              <span>{message}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMessage(false)}
                className="text-white hover:bg-red-600 h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

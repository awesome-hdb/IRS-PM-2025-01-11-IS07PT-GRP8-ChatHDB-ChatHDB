import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { FileDown } from 'lucide-react';
import { Transaction } from '@/app/services/hdbData';
import { usePdfContext } from '@/app/providers/PdfContext';

interface PDFGeneratorProps {
  address: string;
  streetName: string;
  flatType: string;
  transactions: Transaction[];
  valuationAmount?: number;
  amenities?: any[];
  valuationData?: {
    pricePerSqm?: number;
    sampleSize?: number;
    modelMetrics?: {
      r2Score?: number;
    };
    predictionInterval?: {
      lower: number;
      upper: number;
    };
    featureImportance?: Array<{
      feature: string;
      impact: 'positive' | 'negative' | 'neutral';
      strength?: 'strong' | 'moderate' | 'slight';
      importance: number;
    }>;
    economicCorrelations?: Array<{
      index: string;
      correlation: number;
      color: string;
    }>;
    economicTrendMultiplier?: number;
    marketTrends?: {
      recentMonthChange: number;
    };
  };
  className?: string;
  onGenerateStart?: () => void;
  onGenerateEnd?: () => void;
  children?: React.ReactNode;
  disabled?: boolean;
}

const PDFGenerator: React.FC<PDFGeneratorProps> = ({ 
  address, 
  streetName,
  flatType,
  transactions,
  valuationAmount,
  amenities = [],
  valuationData,
  className = '',
  onGenerateStart,
  onGenerateEnd,
  children,
  disabled
}) => {
  const [isGenerating, setIsGenerating] = React.useState(false);
  const { setPdfContent } = usePdfContext();

  const generatePDF = async () => {
    if (isGenerating || disabled) return;
    setIsGenerating(true);
    if (onGenerateStart) onGenerateStart();

    try {
      console.log('Starting PDF generation process...');

      // Create new PDF document with error catching
      let doc: jsPDF;
      // Initialize titleYPosition at the top level of the function
      let titleYPosition = 45; // Default position if logo fails to load
      
      try {
        doc = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });
        console.log('PDF document created successfully');
      } catch (initError) {
        console.error('Error initializing jsPDF:', initError);
        throw new Error('Failed to initialize PDF document');
      }

      // Set default font styles
      try {
        doc.setFont('helvetica', 'normal');
        
        // Add CHATHDB logo
        try {
          const logoUrl = '/logo.png'; // Path to your logo
          const logoImg = new Image();
          logoImg.src = logoUrl;
          
          // Wait for the image to load before adding it to the PDF
          await new Promise<void>((resolve, reject) => {
            logoImg.onload = () => {
              try {
                // Add logo at the top center of the document
                const logoWidth = 50; // Logo width in mm
                const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
                doc.addImage(logoImg, 'PNG', (210 - logoWidth) / 2, 10, logoWidth, logoHeight);
                
                // Calculate the bottom position of the logo to properly position the title
                const logoBottomPosition = 10 + logoHeight;
                // Update the title position based on logo height
                titleYPosition = logoBottomPosition + 15; // Add 15mm gap between logo and title
                
                resolve();
              } catch (err) {
                console.error('Error adding logo to PDF:', err);
                resolve(); // Continue even if logo fails
              }
            };
            logoImg.onerror = () => {
              console.error('Error loading logo image');
              resolve(); // Continue without logo
            };
          });
          
          // Add title and property details after logo
          doc.setFontSize(24);
          doc.setTextColor(33, 33, 33);
          doc.text('Property Valuation Report', 105, titleYPosition, { align: 'center' });
          console.log('Added report title with logo');
        } catch (logoError) {
          console.error('Error loading logo:', logoError);
          // Fallback to title without logo
          doc.setFontSize(24);
          doc.setTextColor(33, 33, 33);
          doc.text('Property Valuation Report', 105, 20, { align: 'center' });
          console.log('Added report title without logo');
        }
      } catch (headerError) {
        console.error('Error adding report header:', headerError);
        // Continue even if header fails
      }
      
      // Add property address - ensure it's a valid string and truncate if too long
      doc.setFontSize(14);
      doc.setTextColor(66, 66, 66);
      const safeAddress = String(address || '').substring(0, 100); // Limit address length
      doc.text(safeAddress, 105, titleYPosition + 10, { align: 'center' });
      
      // Add date
      const currentDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on ${currentDate}`, 105, titleYPosition + 18, { align: 'center' });
      
      // Add horizontal line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, titleYPosition + 23, 190, titleYPosition + 23);
      
      // Add property details section
      doc.setFontSize(16);
      doc.setTextColor(33, 33, 33);
      doc.text('Property Details', 20, titleYPosition + 33);
      
      // Add property info
      doc.setFontSize(11);
      doc.setTextColor(66, 66, 66);
      
      const details = [
        { label: 'Street Name', value: String(streetName || '').trim() || 'N/A' },
        { label: 'Flat Type', value: String(flatType || '').trim() || 'N/A' },
        valuationAmount ? { label: 'Estimated Value', value: `$${valuationAmount.toLocaleString()}` } : null,
      ].filter(Boolean);
      
      let yPos = titleYPosition + 43;
      details.forEach(detail => {
        if (!detail) return;
        try {
          doc.setFont('helvetica', 'bold');
          doc.text(`${detail.label}:`, 20, yPos);
          doc.setFont('helvetica', 'normal');
          // Ensure the value is a string and not empty
          const valueText = String(detail.value || '').trim() || 'N/A';
          doc.text(valueText, 60, yPos);
          yPos += 8;
        } catch (error) {
          console.error(`Error writing detail ${detail.label}:`, error);
          // Continue with next detail
          yPos += 8;
        }
      });
      
      // Add valuation details if available
      if (valuationData) {
        yPos += 4;
        doc.setFontSize(16);
        doc.setTextColor(33, 33, 33);
        doc.text('Valuation Analysis', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(11);
        doc.setTextColor(66, 66, 66);
        
        const valuationDetails = [
          { label: 'Price per SQM', value: valuationData.pricePerSqm ? `$${valuationData.pricePerSqm.toLocaleString()}` : 'N/A' },
          { label: 'Sample Size', value: valuationData.sampleSize ? `${valuationData.sampleSize} transactions` : 'N/A' },
          { label: 'Model Accuracy', value: valuationData.modelMetrics?.r2Score ? 
            `${(valuationData.modelMetrics.r2Score * 100).toFixed(1)}%` : 'N/A' },
          { label: 'Prediction Range', value: valuationData.predictionInterval ? 
            `$${valuationData.predictionInterval.lower.toLocaleString()} - $${valuationData.predictionInterval.upper.toLocaleString()}` : 'N/A' },
        ];
        
        valuationDetails.forEach(detail => {
          try {
            doc.setFont('helvetica', 'bold');
            doc.text(`${detail.label}:`, 20, yPos);
            doc.setFont('helvetica', 'normal');
            // Ensure the value is a string and not empty
            const valueText = String(detail.value || '').trim() || 'N/A';
            doc.text(valueText, 70, yPos);
            yPos += 7;
          } catch (error) {
            console.error(`Error writing valuation detail ${detail.label}:`, error);
            // Continue with next detail
            yPos += 7;
          }
        });
      }
      
      // Add key factors affecting valuation
      if (valuationData?.featureImportance && Array.isArray(valuationData.featureImportance) && valuationData.featureImportance.length > 0) {
        yPos += 4;
        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.text('Key Factors Affecting Valuation', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        
        // Ensure we display chart values and details with percentages
        const defaultFactors: Array<{
          feature: string;
          impact: 'positive' | 'negative' | 'neutral';
          strength: 'strong' | 'moderate' | 'slight';
          importance: number;
        }> = [
          { feature: 'Floor Area', impact: 'positive', strength: 'strong', importance: 0.35 },
          { feature: 'Storey Range', impact: 'positive', strength: 'moderate', importance: 0.25 },
          { feature: 'Lease Year', impact: 'negative', strength: 'moderate', importance: 0.20 },
          { feature: 'Location', impact: 'positive', strength: 'moderate', importance: 0.20 },
        ];
        
        // Use provided factors or defaults if they don't have valid importance values
        const factorsToShow = valuationData.featureImportance.length >= 3 ? 
          valuationData.featureImportance.slice(0, 5) : 
          defaultFactors;
        
        factorsToShow.forEach((factor: { 
          feature: string; 
          impact: 'positive' | 'negative' | 'neutral'; 
          strength?: 'strong' | 'moderate' | 'slight'; 
          importance: number 
        }) => {
          try {
            const impactColor = factor.impact === 'positive' ? '#22c55e' : 
                             factor.impact === 'negative' ? '#ef4444' : '#71717a';
                             
            const strengthText = factor.strength === 'strong' ? 'Strong' : 
                              factor.strength === 'moderate' ? 'Moderate' : 'Slight';
            
            // Feature name
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(66, 66, 66);
            const featureName = String(factor.feature || '').trim() || 'Unknown Factor';
            doc.text(featureName, 20, yPos);
            
            // Impact percentage
            doc.setFont('helvetica', 'normal');
            if (impactColor === '#22c55e') {
              doc.setTextColor(34, 197, 94);
            } else if (impactColor === '#ef4444') {
              doc.setTextColor(239, 68, 68);
            } else {
              doc.setTextColor(113, 113, 122);
            }
            
            let impactValue = 0;
            try {
              impactValue = typeof factor.importance === 'number' ? factor.importance : 0;
            } catch (e) {
              impactValue = 0;
            }
            
            const impactText = `${factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : ''}${(impactValue * 100).toFixed(1)}% impact`;
            doc.text(impactText, 80, yPos);
            
            // Strength
            doc.setTextColor(100, 100, 100);
            doc.text(String(strengthText || 'Moderate'), 130, yPos);
            
            yPos += 7;
          } catch (error) {
            console.error('Error writing factor information:', error);
            yPos += 7; // Still increment position even if there's an error
          }
        });
      }

      // Capture and add chart elements if they exist in the document
      const chartIds = ['valuation-chart', 'economic-chart', 'comparison-chart', 'property-map', 'property-analysis'];
      let hasCharts = false;
      let chartsFound = false;
      
      // Add Economic Performance and Property Location Map on page 2
      let specialChartPage = false;
      
      for (const id of chartIds) {
        // Skip if the chart ID is 'price-trends-chart' since we don't need it
        if (id === 'price-trends-chart') continue;
        
        const chartElement = document.getElementById(id);
        if (chartElement) {
          chartsFound = true;
          
          // Check if this is the Economic Performance chart or Property Map
          const isEconomicChart = id === 'economic-chart';
          const isPropertyMap = id === 'property-map';
          
          // Force these special charts to page 2 with proper positioning
          if (isEconomicChart || isPropertyMap) {
            // Only create page 2 once
            if (!specialChartPage) {
              doc.addPage();
              yPos = 20; // Start at the top of page 2
              specialChartPage = true;
              hasCharts = false; // Reset for special charts page
            }
          } 
          // For other charts, handle page breaks as before
          else if (yPos > 230 || hasCharts) {
            doc.addPage();
            yPos = 20;
            hasCharts = false;
          }
          
          // Add chart title
          doc.setFontSize(14);
          doc.setTextColor(33, 33, 33);
          let chartTitle = '';
          
          switch (id) {
            case 'valuation-chart':
              chartTitle = 'Valuation Distribution';
              break;
            case 'economic-chart':
              chartTitle = 'Economic Performance';
              break;
            case 'comparison-chart':
              chartTitle = 'Area Comparison';
              break;
            case 'property-map':
              chartTitle = 'Property Location Map';
              break;
            case 'property-analysis':
              chartTitle = 'Property Analysis';
              break;
            default:
              chartTitle = 'Chart Analysis';
          }
          
          // Add chart title for all charts
          doc.text(chartTitle, 20, yPos);
          yPos += 7;
          
          // Add a note about the map if it's the property map
          if (id === 'property-map') {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.text('Property location shown approximately. Map not to scale.', 20, yPos);
            yPos += 5;
          }
          
          try {
            // Capture the chart with html2canvas
            const canvas = await html2canvas(chartElement, {
              scale: 2, // Higher scale for better quality
              logging: false,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff'
            });
            
            // Calculate dimensions to fit in PDF
            let imgWidth = 170; // Default width for most charts
            
            // Make property map smaller to ensure it fits on the page
            if (id === 'property-map') {
              imgWidth = 140; // Smaller width for map
              
              // Use a fixed height-to-width ratio for maps to prevent them from being too tall
              const mapAspectRatio = canvas.width / canvas.height;
              // If the map is very tall (small aspect ratio), limit its height
              if (mapAspectRatio < 0.8) {
                imgWidth = 120; // Even smaller width for very tall maps
              }
            }
            
            // For Economic chart, give a bit more space
            if (id === 'economic-chart') {
              imgWidth = 160;
            }
            
            const imgHeight = canvas.height * imgWidth / canvas.width;
            
            // Check if the image would go past the page boundary and adjust if needed
            // Calculate taller max height for special charts on page 2
            const maxHeight = (isEconomicChart || isPropertyMap) ? 110 : 250;
            let finalImgHeight = imgHeight;
            let finalImgWidth = imgWidth;
            
            if (imgHeight > maxHeight) {
              // Maintain aspect ratio when resizing
              const aspectRatio = canvas.width / canvas.height;
              finalImgHeight = maxHeight;
              finalImgWidth = maxHeight * aspectRatio;
              
              // If the width is now too wide, adjust again
              if (finalImgWidth > 170) {
                finalImgWidth = 170;
                finalImgHeight = 170 / aspectRatio;
              }
              
              console.log(`Resizing ${id} chart to fit page (${finalImgWidth.toFixed(1)}mm x ${finalImgHeight.toFixed(1)}mm)`);
            }
            
            // Add the image to the PDF
            const imgData = canvas.toDataURL('image/png');
            
            // Center economic chart
            const xPosition = isEconomicChart ? (210 - finalImgWidth) / 2 : 20;
            doc.addImage(imgData, 'PNG', xPosition, yPos, finalImgWidth, finalImgHeight);
            
            // Calculate vertical space for next element
            yPos += finalImgHeight + 15;
            
            // If this is the economic chart, and property map is next, ensure enough vertical space
            if (isEconomicChart && document.getElementById('property-map')) {
              // If property map will be too close to bottom, start a new page
              if (yPos > 150) {
                doc.addPage();
                yPos = 20;
              }
            }
            
            hasCharts = true;
          } catch (error) {
            console.error(`Error capturing chart ${id}:`, error);
            // Add error message in the PDF
            doc.setFontSize(10);
            doc.setTextColor(255, 0, 0);
            
            if (id === 'property-map') {
              doc.text(`Unable to include property map in the report.`, 20, yPos);
              doc.setFontSize(9);
              doc.setTextColor(100, 100, 100);
              doc.text(`The property is located at ${String(address || '').trim() || 'the specified address'}.`, 20, yPos + 5);
              yPos += 15;
            } else {
              doc.text(`[Unable to capture ${chartTitle} content]`, 20, yPos);
              yPos += 10;
            }
          }
        }
      }
      
      // Add a message if no charts were found
      if (!chartsFound) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("No visual content was found to capture.", 20, yPos);
        yPos += 10;
      }
      
      // Add transaction data table
      if (transactions && Array.isArray(transactions) && transactions.length > 0) {
        try {
          // Add page break if needed
          if (yPos > 200) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(14);
          doc.setTextColor(33, 33, 33);
          doc.text('Recent Transactions', 20, yPos);
          yPos += 10;
          
          // Create safe table data
          const tableData = transactions.slice(0, 8).map(t => {
            try {
              return [
                `Block ${String(t.block || '').trim() || 'N/A'}`,
                String(t.flat_type || '').trim() || 'N/A',
                `${String(t.floor_area_sqm || '').trim() || 'N/A'} sqm`,
                String(t.storey_range || '').trim() || 'N/A',
                `$${(typeof t.resale_price === 'number' ? t.resale_price.toLocaleString() : 'N/A')}`
              ];
            } catch (error) {
              console.error('Error formatting transaction data:', error);
              return ['N/A', 'N/A', 'N/A', 'N/A', 'N/A'];
            }
          });
          
          if (tableData.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Block', 'Flat Type', 'Floor Area', 'Storey', 'Price']],
              body: tableData,
              theme: 'grid',
              headStyles: {
                fillColor: [41, 98, 255],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
              },
              margin: { top: 10, left: 20, right: 20 },
              styles: { fontSize: 9, cellPadding: 3 }
            });
            
            if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
              yPos = (doc as any).lastAutoTable.finalY + 15;
            } else {
              yPos += 50; // Fallback if lastAutoTable is not available
            }
          }
        } catch (error) {
          console.error('Error creating transaction table:', error);
          yPos += 15; // Add some space and continue
        }
      }
      
      // Add amenities section
      if (amenities && Array.isArray(amenities) && amenities.length > 0) {
        try {
          // Add page break if needed
          if (yPos > 200) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(14);
          doc.setTextColor(33, 33, 33);
          doc.text('Nearby Amenities', 20, yPos);
          yPos += 10;
          
          // Create safe amenity data
          const amenityTableData = amenities.slice(0, 8).map(a => {
            try {
              return [
                String(a.type || '').trim() || 'N/A',
                String(a.name || '').trim() || 'N/A',
                String(a.distance || '').trim() || 'N/A'
              ];
            } catch (error) {
              console.error('Error formatting amenity data:', error);
              return ['N/A', 'N/A', 'N/A'];
            }
          });
          
          if (amenityTableData.length > 0) {
            autoTable(doc, {
              startY: yPos,
              head: [['Type', 'Name', 'Distance']],
              body: amenityTableData,
              theme: 'grid',
              headStyles: {
                fillColor: [41, 98, 255],
                textColor: [255, 255, 255],
                fontStyle: 'bold'
              },
              margin: { top: 10, left: 20, right: 20 },
              styles: { fontSize: 9, cellPadding: 3 }
            });
            
            if ((doc as any).lastAutoTable && (doc as any).lastAutoTable.finalY) {
              yPos = (doc as any).lastAutoTable.finalY + 15;
            } else {
              yPos += 50; // Fallback if lastAutoTable is not available
            }
          }
        } catch (error) {
          console.error('Error creating amenities table:', error);
          yPos += 15; // Add some space and continue
        }
      }
      
      // Add a news summary section after the amenities
      try {
        // Add page break if needed
        if (yPos > 200) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(14);
        doc.setTextColor(33, 33, 33);
        doc.text('Recent News Summary', 20, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setTextColor(66, 66, 66);
        
        // Call our API endpoint for news summary
        try {
          // Generate a summary of news stories affecting property market
          const newsResponse = await fetch('/api/generate-report-summary', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              propertyInfo: {
                address,
                flatType,
                reportType: 'news_summary',
                area: streetName
              }
            }),
          });
          
          if (newsResponse.ok) {
            const newsData = await newsResponse.json();
            if (newsData.summary) {
              // Sanitize and format the news summary
              const safeNewsSummary = String(newsData.summary || '').replace(/[^\x20-\x7E\n]/g, '') || 
                'No recent news affecting this property area was found.';
              
              // Add news summary to PDF
              const summaryLines = doc.splitTextToSize(safeNewsSummary, 170);
              doc.text(summaryLines, 20, yPos);
              yPos += summaryLines.length * 5 + 5;
            } else {
              doc.text('No recent news data available for this property area.', 20, yPos);
              yPos += 10;
            }
          } else {
            doc.text('Could not retrieve recent news affecting this property.', 20, yPos);
            yPos += 10;
          }
        } catch (error) {
          console.error('Error generating news summary:', error);
          doc.text('Recent news summary could not be generated.', 20, yPos);
          yPos += 10;
        }
      } catch (error) {
        console.error('Error adding news section:', error);
        // Continue without the news section
      }
      
      // Generate AI summary by calling our API endpoint
      try {
        // Prepare data for the AI prompt
        const propertyInfo = {
          address: String(address || '').trim() || 'Property',
          flatType: String(flatType || '').trim() || 'N/A',
          valuationAmount: valuationAmount ? `$${valuationAmount.toLocaleString()}` : 'Not available',
          pricePerSqm: valuationData?.pricePerSqm ? `$${valuationData.pricePerSqm.toLocaleString()}` : 'Not available',
          transactions: transactions?.length || 0,
          keyFactors: valuationData?.featureImportance && Array.isArray(valuationData.featureImportance)
            ? valuationData.featureImportance.slice(0, 4)
                .map(f => `${String(f.feature || 'Factor')} (${f.impact === 'positive' ? 'positive' : f.impact === 'negative' ? 'negative' : 'neutral'} impact, ${(typeof f.importance === 'number' ? (f.importance * 100).toFixed(1) : '0')}%)`)
                .join(', ') 
            : 'No factors available',
          predictionRange: valuationData?.predictionInterval 
            ? `$${valuationData.predictionInterval.lower.toLocaleString()} - $${valuationData.predictionInterval.upper.toLocaleString()}`
            : 'Not available',
          amenities: amenities && Array.isArray(amenities) && amenities.length > 0
            ? amenities.slice(0, 5).map(a => `${String(a.name || 'Amenity')} (${String(a.distance || 'nearby')})`).join(', ')
            : 'No amenities data available',
          // Add economic correlations and multipliers
          economicCorrelations: valuationData?.economicCorrelations && Array.isArray(valuationData.economicCorrelations)
            ? valuationData.economicCorrelations.map((c: { index: string; correlation: number }) => 
                `${c.index.replace('Index', '').trim()} (correlation: ${c.correlation.toFixed(2)})`
              ).join(', ')
            : 'No economic data available',
          economicMultiplier: valuationData?.economicTrendMultiplier 
            ? `${((valuationData.economicTrendMultiplier - 1) * 100).toFixed(2)}%` 
            : '0%',
          marketTrends: valuationData?.marketTrends 
            ? `${valuationData.marketTrends.recentMonthChange > 0 ? '+' : ''}${valuationData.marketTrends.recentMonthChange.toFixed(1)}% month-over-month` 
            : 'Not available',
          includeMarketAnalytics: true,
          includeFormattedText: true
        };
        
        // Call our API endpoint instead of directly calling Gemini
        console.log('Calling API for report summary with property info:', propertyInfo);
        const response = await fetch('/api/generate-report-summary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ propertyInfo }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to generate AI summary: ${response.status}`);
        }
        
        const data = await response.json();
        if (!data.summary) {
          throw new Error('AI summary endpoint returned no data');
        }
        
        const summary = data.summary;
        console.log('Received AI summary, length:', summary?.length || 0);
        
        // Add AI summary to PDF
        try {
          // Add page break if needed
          if (yPos > 180) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(14);
          doc.setTextColor(33, 33, 33);
          doc.text('AI Analysis Summary', 20, yPos);
          yPos += 8;
          
          doc.setFontSize(10);
          doc.setTextColor(66, 66, 66);
          
          // Sanitize summary text and handle potential nulls
          const safeSummary = String(summary || '').replace(/[^\x20-\x7E\n]/g, '') || 'Summary could not be generated.';
          
          // Simple approach - just handle bold text but maintain paragraph structure
          const paragraphs = safeSummary.split(/\n\n|\r\n\r\n/).filter(p => p.trim());
          
          let currentY = yPos;
          
          for (let i = 0; i < paragraphs.length; i++) {
            // Check if we need a page break
            if (currentY > 260) {
              doc.addPage();
              currentY = 20;
            }
            
            // Replace bold markers with formatting
            const paragraph = paragraphs[i].trim();
            const boldPattern = /\*\*(.*?)\*\*/g;
            
            // First, render the paragraph without bold formatting to get line breaks
            const lines = doc.splitTextToSize(paragraph.replace(boldPattern, '$1'), 170);
            
            // Now go through each line and apply bold formatting where needed
            for (let j = 0; j < lines.length; j++) {
              const line = lines[j];
              let lineX = 20;
              let lastIndex = 0;
              let match;
              
              // Reset the pattern for each line
              boldPattern.lastIndex = 0;
              
              // Create a copy of the line that we can modify as we go
              let remainingLine = line;
              let lineY = currentY + (j * 5);
              
              // Find all bold sections in this line
              while ((match = boldPattern.exec(paragraph)) !== null) {
                const boldText = match[1];
                const fullMatch = match[0]; // **text**
                
                // Check if this bold text is in the current line
                const startPos = remainingLine.indexOf(fullMatch);
                if (startPos === -1) continue;
                
                // Get the text before the bold part
                const beforeText = remainingLine.substring(0, startPos);
                
                // Render normal text before the bold part
                if (beforeText) {
                  doc.setFont('helvetica', 'normal');
                  doc.text(beforeText, lineX, lineY);
                  lineX += doc.getTextWidth(beforeText);
                }
                
                // Render the bold text
                doc.setFont('helvetica', 'bold');
                doc.text(boldText, lineX, lineY);
                lineX += doc.getTextWidth(boldText);
                
                // Update the remaining line
                remainingLine = remainingLine.substring(startPos + fullMatch.length);
              }
              
              // Render any remaining text
              if (remainingLine) {
                doc.setFont('helvetica', 'normal');
                doc.text(remainingLine, lineX, lineY);
              }
            }
            
            // Move to next paragraph with spacing
            currentY += (lines.length * 5) + 5;
          }
          
          yPos = currentY;
        } catch (error) {
          console.error('Error generating AI summary:', error);
          
          // Fallback to a simpler approach
          doc.setFontSize(10);
          doc.setTextColor(66, 66, 66);
          doc.text('An AI summary could not be generated for this report.', 20, yPos);
          yPos += 10;
        }
      } catch (error) {
        console.error('Error generating AI summary:', error);
        // Add error message in PDF
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }
        doc.setFontSize(12);
        doc.setTextColor(255, 0, 0);
        doc.text('AI summary could not be generated.', 20, yPos);
      }
      
      // Add footer with page numbers
      try {
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(150, 150, 150);
          doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
          doc.text('Generated by CHATHDB Property Valuation System', 105, 295, { align: 'center' });
        }
      } catch (error) {
        console.error('Error adding footer:', error);
        // Continue without footer if there's an error
      }
      
      // Store the PDF content as text for the chat context
      let pdfTextContent = `Property Valuation Report for ${safeAddress}\nGenerated on ${currentDate}\n\n`;
      
      pdfTextContent += `Property Details:\n`;
      details.forEach(detail => {
        if (!detail) return;
        pdfTextContent += `${detail.label}: ${String(detail.value || '').trim() || 'N/A'}\n`;
      });
      
      if (valuationData) {
        pdfTextContent += `\nValuation Analysis:\n`;
        pdfTextContent += `Price per SQM: ${valuationData.pricePerSqm ? `$${valuationData.pricePerSqm.toLocaleString()}` : 'N/A'}\n`;
        pdfTextContent += `Sample Size: ${valuationData.sampleSize ? `${valuationData.sampleSize} transactions` : 'N/A'}\n`;
        pdfTextContent += `Model Accuracy: ${valuationData.modelMetrics?.r2Score ? 
          `${(valuationData.modelMetrics.r2Score * 100).toFixed(1)}%` : 'N/A'}\n`;
        pdfTextContent += `Prediction Range: ${valuationData.predictionInterval ? 
          `$${valuationData.predictionInterval.lower.toLocaleString()} - $${valuationData.predictionInterval.upper.toLocaleString()}` : 'N/A'}\n`;
      }
      
      if (valuationData?.featureImportance && Array.isArray(valuationData.featureImportance) && valuationData.featureImportance.length > 0) {
        pdfTextContent += `\nKey Factors Affecting Valuation:\n`;
        valuationData.featureImportance.slice(0, 5).forEach(factor => {
          const impactValue = typeof factor.importance === 'number' ? factor.importance : 0;
          const impactText = `${factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : ''}${(impactValue * 100).toFixed(1)}%`;
          pdfTextContent += `${String(factor.feature || '').trim() || 'Unknown Factor'}: ${impactText} impact (${factor.strength || 'moderate'})\n`;
        });
      }
      
      if (transactions && Array.isArray(transactions) && transactions.length > 0) {
        pdfTextContent += `\nRecent Transactions:\n`;
        transactions.slice(0, 8).forEach(t => {
          pdfTextContent += `Block ${String(t.block || '').trim() || 'N/A'}, ${String(t.flat_type || '').trim() || 'N/A'}, ${String(t.floor_area_sqm || '').trim() || 'N/A'} sqm, ${String(t.storey_range || '').trim() || 'N/A'}, $${(typeof t.resale_price === 'number' ? t.resale_price.toLocaleString() : 'N/A')}\n`;
        });
      }
      
      if (amenities && Array.isArray(amenities) && amenities.length > 0) {
        pdfTextContent += `\nNearby Amenities:\n`;
        amenities.slice(0, 8).forEach(a => {
          pdfTextContent += `${String(a.type || '').trim() || 'N/A'}: ${String(a.name || '').trim() || 'N/A'} (${String(a.distance || '').trim() || 'N/A'})\n`;
        });
      }
      
      // Store the PDF text content in context
      setPdfContent(pdfTextContent);
      
      // Save the PDF
      console.log('Finalizing PDF for saving...');
      try {
        // Clean up the street name to create a valid filename
        const safeStreetName = String(streetName || 'Property')
          .replace(/[^a-zA-Z0-9_]/g, '_') // Replace any non-alphanumeric chars with underscore
          .replace(/_+/g, '_') // Replace multiple underscores with a single one
          .substring(0, 30) // Limit length 
          .trim();
        
        const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').substring(0, 14);
        const filename = `${safeStreetName}_Valuation_${timestamp}.pdf`;
        
        doc.save(filename);
        console.log('PDF saved successfully:', filename);
      } catch (error) {
        console.error('Error saving PDF:', error);
        
        // Try a simplified filename as fallback
        try {
          doc.save('Property_Valuation_Report.pdf');
          console.log('PDF saved with fallback filename');
        } catch (fallbackError) {
          console.error('Fatal error saving PDF:', fallbackError);
          alert('Could not save the PDF. Please try again or contact support.');
        }
      }
    } catch (mainError) {
      console.error('Fatal error in PDF generation:', mainError);
      alert('An error occurred while generating the PDF. Please try again later.');
    } finally {
      setIsGenerating(false);
      if (onGenerateEnd) onGenerateEnd();
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={isGenerating || disabled}
      className={`relative inline-flex items-center justify-center text-sm font-medium 
        ${isGenerating ? 'bg-primary/80 animate-pulse' : 'bg-primary hover:bg-primary/90'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        text-foreground
        transition-all duration-300 ease-in-out
        transform ${className}`}
      title="Generate a PDF report with all property valuation information"
    >
      {isGenerating ? (
        <div className="flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          <span>Generating Report</span>
        </div>
      ) : children ? (
        children
      ) : (
        <>
          <FileDown className="mr-2 h-4 w-4" />
          <span>Generate Report</span>
        </>
      )}
    </Button>
  );
};

export default PDFGenerator; 
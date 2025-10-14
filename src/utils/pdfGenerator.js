// src/utils/pdfGenerator.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ---------- Modern Clean Theme ---------- */
const PRIMARY_COLOR = [34, 197, 94]; // Tailwind green-500
const SECONDARY_COLOR = [21, 128, 61]; // Tailwind green-700
const TEXT_COLOR = [30, 30, 30]; // Dark gray
const LIGHT_TEXT_COLOR = [110, 110, 110]; // Medium gray
const BORDER_COLOR = [230, 230, 230]; // Subtle gray border
const BACKGROUND_COLOR = [250, 250, 250]; // Soft white background

/* ---------- Helper Functions ---------- */
function formatMoney(amount) {
  return `LKR ${Number(amount || 0).toFixed(2)}`;
}

function formatDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return "—";
  }
}

function capitalize(str) {
  if (!str) return "—";
  try {
    return String(str).replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    return "—";
  }
}

async function loadLogoAsDataUrl() {
  try {
    const response = await fetch("/mainlogo2.svg", { cache: "no-cache" });
    const svgText = await response.text();
    const svg64 = btoa(unescape(encodeURIComponent(svgText)));
    return "data:image/svg+xml;base64," + svg64;
  } catch (error) {
    console.warn("Could not load logo:", error);
    return null;
  }
}

function createImageFromSvg(svgDataUrl, width = 120, height = 40) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, width, height);

      const scale = Math.min(width / img.width, height / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      ctx.drawImage(
        img,
        (width - scaledWidth) / 2,
        (height - scaledHeight) / 2,
        scaledWidth,
        scaledHeight
      );

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
    img.src = svgDataUrl;
  });
}

/* ---------- Data Validation ---------- */
function validateAndCleanData(data) {
  if (!Array.isArray(data)) return [];

  return data.map((item) => {
    if (!item || typeof item !== "object") return {};

    const cleanedItem = {};

    Object.keys(item).forEach((key) => {
      const value = item[key];
      if (value === null || value === undefined) {
        cleanedItem[key] = "";
      } else if (typeof value === "number") {
        cleanedItem[key] = value;
      } else if (typeof value === "boolean") {
        cleanedItem[key] = value ? "Yes" : "No";
      } else {
        cleanedItem[key] = String(value);
      }
    });

    return cleanedItem;
  });
}

/* ---------- Custom User PDF Generator ---------- */
export async function generateUserReportPDFCustom({
  title,
  subtitle,
  countries,
  stats,
  filename,
}) {
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let logoDataUrl = null;
    try {
      const logoUrl = await loadLogoAsDataUrl();
      if (logoUrl) {
        logoDataUrl = await createImageFromSvg(logoUrl, 120, 40);
      }
    } catch (error) {
      console.warn("Could not process logo:", error);
    }

    /* ---------- Header Section ---------- */
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, pageWidth, 70, "F");

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 36, 18, 120, 40);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth - 36, 35, { align: "right" });

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(subtitle, pageWidth - 36, 52, { align: "right" });
    }

    doc.setFontSize(9);
    doc.setTextColor(245, 245, 245);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 36, 65, {
      align: "right",
    });

    let currentY = 95;

    /* ---------- Statistics Cards ---------- */
    if (stats && stats.length > 0) {
      const cardWidth = (pageWidth - 72 - 16) / 2;
      const cardHeight = 70;

      stats.forEach((stat, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = 36 + col * (cardWidth + 16);
        const y = currentY + row * (cardHeight + 12);

        // Shadowed card
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER_COLOR);
        doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, "FD");

        // Stat label
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...LIGHT_TEXT_COLOR);
        doc.text(stat.label, x + 14, y + 22);

        // Stat value
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text(String(stat.value), x + 14, y + 42);

        // Subtitle (optional)
        if (stat.subtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...LIGHT_TEXT_COLOR);
          doc.text(stat.subtitle, x + 14, y + 56);
        }
      });

      const statsRows = Math.ceil(stats.length / 2);
      currentY += statsRows * (cardHeight + 12) + 20;
    }

    /* ---------- Countries Table Section ---------- */
    if (countries && countries.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...TEXT_COLOR);
      doc.text("Top Countries by New Users", 36, currentY);
      currentY += 16;

      // Prepare table data with Country, User count, and Percentage
      const tableData = countries.map((country, index) => [
        String(index + 1),
        String(country.country || "Unknown"),
        String(country.count || 0),
        `${country.percentage || 0}%`
      ]);

      const headers = ["#", "Country", "User Count", "Percentage"];

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: PRIMARY_COLOR,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: TEXT_COLOR,
          cellPadding: 6,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        styles: {
          lineColor: BORDER_COLOR,
        },
        columnStyles: {
          0: { cellWidth: 30 },  // # column
          1: { cellWidth: 150 }, // Country column
          2: { cellWidth: 80 },  // User Count column
          3: { cellWidth: 80 }   // Percentage column
        },
        margin: { left: 36, right: 36 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(...LIGHT_TEXT_COLOR);
          doc.text(`Generated ${new Date().toLocaleString()}`, 36, pageHeight - 20);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 36, pageHeight - 20, {
            align: "right",
          });
        },
      });
    }

    const finalFilename =
      filename ||
      `${title.toLowerCase().replace(/\s+/g, "-")}-report-${Date.now()}.pdf`;
    doc.save(finalFilename);

    return true;
  } catch (error) {
    console.error("User PDF generation failed:", error);
    if (error.message?.includes("Type of text must be string")) {
      throw new Error(
        "PDF generation failed: Invalid data type detected. Please ensure all data is properly formatted."
      );
    }
    throw new Error("Failed to generate user PDF report");
  }
}

/* ---------- Custom Blog PDF Generator ---------- */
export async function generateBlogReportPDFCustom({
  title,
  subtitle,
  blogs,
  stats,
  filename,
}) {
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let logoDataUrl = null;
    try {
      const logoUrl = await loadLogoAsDataUrl();
      if (logoUrl) {
        logoDataUrl = await createImageFromSvg(logoUrl, 120, 40);
      }
    } catch (error) {
      console.warn("Could not process logo:", error);
    }

    /* ---------- Header Section ---------- */
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, pageWidth, 70, "F");

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 36, 18, 120, 40);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth - 36, 35, { align: "right" });

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(subtitle, pageWidth - 36, 52, { align: "right" });
    }

    doc.setFontSize(9);
    doc.setTextColor(245, 245, 245);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 36, 65, {
      align: "right",
    });

    let currentY = 95;

    /* ---------- Statistics Cards ---------- */
    if (stats && stats.length > 0) {
      const cardWidth = (pageWidth - 72 - 16) / 2;
      const cardHeight = 70;

      stats.forEach((stat, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = 36 + col * (cardWidth + 16);
        const y = currentY + row * (cardHeight + 12);

        // Shadowed card
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER_COLOR);
        doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, "FD");

        // Stat label
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...LIGHT_TEXT_COLOR);
        doc.text(stat.label, x + 14, y + 22);

        // Stat value
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text(String(stat.value), x + 14, y + 42);

        // Subtitle (optional)
        if (stat.subtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...LIGHT_TEXT_COLOR);
          doc.text(stat.subtitle, x + 14, y + 56);
        }
      });

      const statsRows = Math.ceil(stats.length / 2);
      currentY += statsRows * (cardHeight + 12) + 20;
    }

    /* ---------- Blog Table Section ---------- */
    if (blogs && blogs.length > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...TEXT_COLOR);
      doc.text("Blog Posts by View Count", 36, currentY);
      currentY += 16;

      // Prepare table data with only title, author, and view count
      const tableData = blogs.map((blog, index) => [
        String(index + 1),
        String(blog.title || "Untitled"),
        String(blog.author || "Unknown"),
        String(blog.viewCount || 0)
      ]);

      const headers = ["#", "Title", "Author", "View Count"];

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: PRIMARY_COLOR,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: TEXT_COLOR,
          cellPadding: 6,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        styles: {
          lineColor: BORDER_COLOR,
        },
        columnStyles: {
          0: { cellWidth: 30 },  // # column
          1: { cellWidth: 200 }, // Title column
          2: { cellWidth: 100 }, // Author column
          3: { cellWidth: 80 }   // View Count column
        },
        margin: { left: 36, right: 36 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(...LIGHT_TEXT_COLOR);
          doc.text(`Generated ${new Date().toLocaleString()}`, 36, pageHeight - 20);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 36, pageHeight - 20, {
            align: "right",
          });
        },
      });
    }

    const finalFilename =
      filename ||
      `${title.toLowerCase().replace(/\s+/g, "-")}-report-${Date.now()}.pdf`;
    doc.save(finalFilename);

    return true;
  } catch (error) {
    console.error("Blog PDF generation failed:", error);
    if (error.message?.includes("Type of text must be string")) {
      throw new Error(
        "PDF generation failed: Invalid data type detected. Please ensure all data is properly formatted."
      );
    }
    throw new Error("Failed to generate blog PDF report");
  }
}

/* ---------- Main PDF Generator ---------- */
export async function generateReportPDF({
  title,
  subtitle,
  data,
  stats,
  filters = [],
  filename,
}) {
  try {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    let logoDataUrl = null;
    try {
      const logoUrl = await loadLogoAsDataUrl();
      if (logoUrl) {
        logoDataUrl = await createImageFromSvg(logoUrl, 120, 40);
      }
    } catch (error) {
      console.warn("Could not process logo:", error);
    }

    /* ---------- Header Section ---------- */
    doc.setFillColor(...PRIMARY_COLOR);
    doc.rect(0, 0, pageWidth, 70, "F");

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", 36, 18, 120, 40);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageWidth - 36, 35, { align: "right" });

    if (subtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.text(subtitle, pageWidth - 36, 52, { align: "right" });
    }

    doc.setFontSize(9);
    doc.setTextColor(245, 245, 245);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 36, 65, {
      align: "right",
    });

    let currentY = 95;

    /* ---------- Filters Section ---------- */
    if (filters.length > 0) {
      doc.setFontSize(11);
      doc.setTextColor(...TEXT_COLOR);
      doc.text("Applied Filters", 36, currentY);
      currentY += 14;

      let filterX = 36;
      const filterPadding = 6;

      filters.forEach((filter) => {
        const filterText = `${filter.label}: ${filter.value}`;
        const textWidth = doc.getTextWidth(filterText) + filterPadding * 2;
        if (filterX + textWidth > pageWidth - 100) {
          filterX = 36;
          currentY += 22;
        }
        doc.setFillColor(...BACKGROUND_COLOR);
        doc.setDrawColor(...BORDER_COLOR);
        doc.roundedRect(filterX, currentY - 12, textWidth, 18, 4, 4, "FD");
        doc.setFontSize(10);
        doc.setTextColor(...LIGHT_TEXT_COLOR);
        doc.text(filterText, filterX + filterPadding, currentY + 2);
        filterX += textWidth + 8;
      });
      currentY += 30;
    }

    /* ---------- Statistics Cards ---------- */
    if (stats && stats.length > 0) {
      const cardWidth = (pageWidth - 72 - 16) / 2;
      const cardHeight = 70;

      stats.forEach((stat, index) => {
        const row = Math.floor(index / 2);
        const col = index % 2;
        const x = 36 + col * (cardWidth + 16);
        const y = currentY + row * (cardHeight + 12);

        // Shadowed card
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...BORDER_COLOR);
        doc.roundedRect(x, y, cardWidth, cardHeight, 10, 10, "FD");

        // Stat label
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...LIGHT_TEXT_COLOR);
        doc.text(stat.label, x + 14, y + 22);

        // Stat value
        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(...PRIMARY_COLOR);
        doc.text(String(stat.value), x + 14, y + 42);

        // Subtitle (optional)
        if (stat.subtitle) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(9);
          doc.setTextColor(...LIGHT_TEXT_COLOR);
          doc.text(stat.subtitle, x + 14, y + 56);
        }
      });

      const statsRows = Math.ceil(stats.length / 2);
      currentY += statsRows * (cardHeight + 12) + 20;
    }

    /* ---------- Table Section ---------- */
    if (data && data.length > 0) {
      const cleanedData = validateAndCleanData(data);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...TEXT_COLOR);
      doc.text("Detailed Report", 36, currentY);
      currentY += 16;

      const tableData = cleanedData.map((item, index) => {
        const row = [String(index + 1)];
        if (item.name) row.push(String(item.name));
        if (item.category) row.push(capitalize(item.category));
        if (item.status) row.push(capitalize(item.status));
        if (item.rentals !== undefined) row.push(String(item.rentals));
        if (item.bookings !== undefined) row.push(String(item.bookings));
        if (item.revenue !== undefined) row.push(formatMoney(item.revenue));
        if (item.amount !== undefined) row.push(formatMoney(item.amount));
        if (item.price !== undefined) row.push(formatMoney(item.price));
        if (item.orders !== undefined) row.push(String(item.orders));
        if (item.nightsSold !== undefined) row.push(String(item.nightsSold));
        if (item.views !== undefined) row.push(String(item.views));
        if (item.rating !== undefined) row.push(String(item.rating));
        if (item.count !== undefined) row.push(String(item.count));
        if (item.date) row.push(formatDate(item.date));
        if (item.createdAt) row.push(formatDate(item.createdAt));
        return row;
      });

      const headers = ["#"];
      if (cleanedData[0]) {
        if (cleanedData[0].name) headers.push("Name");
        if (cleanedData[0].category) headers.push("Category");
        if (cleanedData[0].status) headers.push("Status");
        if (cleanedData[0].rentals !== undefined) headers.push("Rentals");
        if (cleanedData[0].bookings !== undefined) headers.push("Bookings");
        if (cleanedData[0].revenue !== undefined) headers.push("Revenue");
        if (cleanedData[0].amount !== undefined) headers.push("Amount");
        if (cleanedData[0].price !== undefined) headers.push("Price");
        if (cleanedData[0].orders !== undefined) headers.push("Orders");
        if (cleanedData[0].nightsSold !== undefined) headers.push("Nights Sold");
        if (cleanedData[0].views !== undefined) headers.push("Views");
        if (cleanedData[0].rating !== undefined) headers.push("Rating");
        if (cleanedData[0].count !== undefined) headers.push("Count");
        if (cleanedData[0].date) headers.push("Date");
        if (cleanedData[0].createdAt) headers.push("Created");
      }

      autoTable(doc, {
        startY: currentY,
        head: [headers],
        body: tableData,
        theme: "grid",
        headStyles: {
          fillColor: PRIMARY_COLOR,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: "bold",
        },
        bodyStyles: {
          fontSize: 9,
          textColor: TEXT_COLOR,
          cellPadding: 6,
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251],
        },
        styles: {
          lineColor: BORDER_COLOR,
        },
        margin: { left: 36, right: 36 },
        didDrawPage: (data) => {
          doc.setFontSize(8);
          doc.setTextColor(...LIGHT_TEXT_COLOR);
          doc.text(`Generated ${new Date().toLocaleString()}`, 36, pageHeight - 20);
          doc.text(`Page ${data.pageNumber}`, pageWidth - 36, pageHeight - 20, {
            align: "right",
          });
        },
      });
    }

    const finalFilename =
      filename ||
      `${title.toLowerCase().replace(/\s+/g, "-")}-report-${Date.now()}.pdf`;
    doc.save(finalFilename);

    return true;
  } catch (error) {
    console.error("PDF generation failed:", error);
    if (error.message?.includes("Type of text must be string")) {
      throw new Error(
        "PDF generation failed: Invalid data type detected. Please ensure all data is properly formatted."
      );
    }
    throw new Error("Failed to generate PDF report");
  }
}

/* ---------- Report Type Functions (unchanged) ---------- */
// (Keep all your generateVehicleReportPDF, generateTourPackageReportPDF, etc. functions unchanged)


/* ---------- Specific Report Generators ---------- */
export async function generateVehicleReportPDF(reports) {
  // Calculate maintenance load
  const maintenanceLoad = Array.isArray(reports.mostRented)
    ? reports.mostRented.filter(v => v.status === 'under_maintenance').length
    : 0;

  const stats = [
    { label: "Total Vehicles", value: reports.totalVehicles || 0 },
    { label: "Total Rentals", value: reports.totalRentals || 0 },
    { label: "Total Revenue", value: formatMoney(reports.totalRevenue || 0) },
    { label: "Maintenance Load", value: maintenanceLoad }
  ];

  // Combine and deduplicate by _id (or name if _id missing)
  const allVehicles = [
    ...(reports.mostRented || []),
    ...(reports.leastRented || [])
  ];
  const uniqueVehicles = allVehicles.filter((veh, idx, arr) =>
    idx === arr.findIndex(v =>
      veh._id ? v._id === veh._id : v.name === veh.name
    )
  );

  return generateReportPDF({
    title: "Vehicle Rental Report",
    subtitle: "Most & Least Rented Vehicles Analysis",
    data: uniqueVehicles,
    stats,
    filename: `vehicle-rental-report-${Date.now()}.pdf`
  });
}

export async function generateTourPackageReportPDF(reportData) {
  const stats = [
    { label: "Total Packages", value: reportData.totalPackages || 0 },
    { label: "Total Bookings", value: reportData.totalBookings || 0 },
    { label: "Total Revenue", value: formatMoney(reportData.totalRevenue || 0) },
    { label: "Avg Booking Rate", value: `${reportData.avgBookingRate?.toFixed(1) || 0}%` }
  ];

  // Combine and deduplicate by _id (or name if _id missing)
  const allPackages = [
    ...(reportData.mostBooked || []),
    ...(reportData.leastBooked || []),
    ...(reportData.topRevenue || [])
  ];
  const uniquePackages = allPackages.filter((pkg, idx, arr) =>
    idx === arr.findIndex(p =>
      pkg._id ? p._id === pkg._id : p.name === pkg.name
    )
  );

  return generateReportPDF({
    title: "Tour Package Report",
    subtitle: "Most & Least Booked Packages Analysis",
    data: uniquePackages,
    stats,
    filename: `tour-package-report-${Date.now()}.pdf`
  });
}

export async function generateBlogReportPDF(reportData) {
  const stats = [
    { label: "Total Posts", value: reportData.totalPosts || 0 },
    { label: "Total Views", value: reportData.totalViews || 0 },
    { label: "Avg Views", value: reportData.avgViews?.toFixed(1) || 0 }
  ];

  // Combine all blog data and sort by view count (descending)
  const allBlogs = [...(reportData.mostRead || []), ...(reportData.leastRead || [])];
  
  // Remove duplicates and sort by view count descending
  const uniqueBlogs = allBlogs.filter((blog, index, self) => 
    index === self.findIndex(b => b._id === blog._id)
  );
  
  const sortedBlogs = uniqueBlogs.sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));

  return generateBlogReportPDFCustom({
    title: "Blog Performance Report",
    subtitle: "Blog Posts Sorted by View Count",
    blogs: sortedBlogs,
    stats,
    filename: `blog-performance-report-${Date.now()}.pdf`
  });
}

export async function generateMealReportPDF(reportData) {
  const stats = [
    { label: "Total Meals", value: reportData.totalMeals || 0 },
    { label: "Total Orders", value: reportData.totalOrders || 0 },
    { label: "Total Revenue", value: formatMoney(reportData.totalRevenue || 0) },
    { label: "Avg Order Value", value: formatMoney(reportData.avgOrderValue || 0) }
  ];

  // Combine and deduplicate by _id (or name if _id missing)
  const allMeals = [
    ...(reportData.mostOrdered || []),
    ...(reportData.leastOrdered || [])
  ];
  const uniqueMeals = allMeals.filter((meal, idx, arr) =>
    idx === arr.findIndex(m =>
      meal._id ? m._id === meal._id : m.name === meal.name
    )
  );

  return generateReportPDF({
    title: "Meal Orders Report",
    subtitle: "Most & Least Ordered Meals Analysis",
    data: uniqueMeals,
    stats,
    filename: `meal-orders-report-${Date.now()}.pdf`
  });
}

export async function generateAccommodationReportPDF(reportData) {
  const stats = [
    { label: "Total Properties", value: reportData.totalProperties || 0 },
    { label: "Total Nights Sold", value: reportData.totalNights || 0 },
    { label: "Total Revenue", value: formatMoney(reportData.totalRevenue || 0) },
    { label: "Avg Occupancy", value: `${reportData.avgOccupancy?.toFixed(1) || 0} nights` }
  ];

  // Combine and deduplicate by _id (or name if _id missing)
  const allProperties = [
    ...(reportData.mostBooked || []),
    ...(reportData.leastBooked || [])
  ];
  const uniqueProperties = allProperties.filter((prop, idx, arr) =>
    idx === arr.findIndex(p =>
      prop._id ? p._id === prop._id : p.name === prop.name
    )
  );

  return generateReportPDF({
    title: "Accommodation Report",
    subtitle: "Most & Least Booked Properties Analysis",
    data: uniqueProperties,
    stats,
    filename: `accommodation-report-${Date.now()}.pdf`
  });
}

export async function generateFeedbackReportPDF(reportData) {
  const stats = [
    { label: "Total Feedbacks", value: reportData.totalFeedbacks || 0 },
    { label: "Avg Rating", value: `${reportData.avgRating?.toFixed(1) || 0}/5` },
    { label: "Active Reviewers", value: reportData.activeReviewers || 0 }
  ];

  const mostPraisedData = reportData.mostPraised || [];
  const mostCriticizedData = reportData.mostCriticized || [];
  const mostActiveReviewersData = reportData.mostActiveReviewers || [];

  return generateReportPDF({
    title: "Customer Feedback Report",
    subtitle: "Most Praised & Criticized Items Analysis",
    data: [...mostPraisedData, ...mostCriticizedData, ...mostActiveReviewersData],
    stats,
    filename: `customer-feedback-report-${Date.now()}.pdf`
  });
}

export async function generateComplaintReportPDF(reportData) {
  const stats = [
    { label: "Total Complaints", value: reportData.totalComplaints || 0 },
    { label: "Resolved Rate", value: `${reportData.resolvedRate?.toFixed(1) || 0}%` },
    { label: "Avg Resolution Time", value: `${reportData.avgResolutionTime?.toFixed(1) || 0} days` },
    { label: "Unresolved Count", value: reportData.unresolvedCount || 0 }
  ];

  const leastComplainedData = reportData.leastComplainedCategories || [];
  const mostComplainedData = reportData.mostComplainedServices || [];
  const oldestUnresolvedData = reportData.oldestUnresolved || [];

  return generateReportPDF({
    title: "Customer Complaints Report",
    subtitle: "Complaint Categories & Resolution Analysis",
    data: [...leastComplainedData, ...mostComplainedData, ...oldestUnresolvedData],
    stats,
    filename: `customer-complaints-report-${Date.now()}.pdf`
  });
}

export async function generateInventoryReportPDF(reportData) {
  const stats = [
    { label: "Total Items", value: reportData.totalItems || 0 },
    { label: "Total Value", value: formatMoney(reportData.totalValue || 0) },
    { label: "Low Stock Items", value: reportData.lowStockCount || 0 },
    { label: "Expiring Soon", value: reportData.expiringSoon || 0 }
  ];

  // Combine and deduplicate by _id (or name if _id missing)
  const allItems = [
    ...(reportData.fastestMoving || []),
    ...(reportData.mostOutOfStock || []),
    ...(reportData.soonestToExpire || [])
  ];
  const uniqueItems = allItems.filter((item, idx, arr) =>
    idx === arr.findIndex(i =>
      item._id ? i._id === item._id : i.name === item.name
    )
  );

  return generateReportPDF({
    title: "Inventory Management Report",
    subtitle: "Fastest Moving & Stock Analysis",
    data: uniqueItems,
    stats,
    filename: `inventory-management-report-${Date.now()}.pdf`
  });
}

export async function generateUserReportPDF(reportData) {
  const stats = [
    { label: "Total Users", value: reportData.totalUsers || 0 },
    { label: "New This Month", value: reportData.newUsersThisMonth || 0 },
    { label: "Growth Rate", value: `${reportData.growthRate?.toFixed(1) || 0}%` }
  ];

  // Get top countries data (already sorted by count in descending order from API)
  const topCountries = reportData.topCountries || [];

  return generateUserReportPDFCustom({
    title: "User Analytics Report",
    subtitle: "Top Countries by New Users",
    countries: topCountries,
    stats,
    filename: `user-analytics-report-${Date.now()}.pdf`
  });
}

export async function generateFinanceReportPDF(reportData) {
  const stats = [
    { label: "Total Revenue", value: formatMoney(reportData.totalRevenue || 0) },
    { label: "Total Expenses", value: formatMoney(reportData.totalExpenses || 0) },
    { label: "Net Profit", value: formatMoney(reportData.netProfit || 0) },
    { label: "Profit Margin", value: `${reportData.profitMargin?.toFixed(1) || 0}%` }
  ];

  // Combine and deduplicate by _id (or name if _id missing)
  const allProducts = [
    ...(reportData.topRevenueProducts || []),
    ...(reportData.lowestRevenueProducts || [])
  ];
  const uniqueProducts = allProducts.filter((prod, idx, arr) =>
    idx === arr.findIndex(p =>
      prod._id ? p._id === prod._id : p.name === prod.name
    )
  );

  return generateReportPDF({
    title: "Financial Performance Report",
    subtitle: "Revenue & Profit Analysis",
    data: uniqueProducts,
    stats,
    filename: `financial-performance-report-${Date.now()}.pdf`
  });
}

export async function generateBookingReportPDF(reportData) {
  const stats = [
    { label: "Total Bookings", value: reportData.totalBookings || 0 },
    { label: "Total Revenue", value: formatMoney(reportData.totalRevenue || 0) }
  ];

  // Combine all booking arrays (add other arrays if needed)
  const allBookings = [
    ...(reportData.allBookings || []),
    ...(reportData.busiestDates || []),
    ...(reportData.quietestDates || [])
  ];

  // Remove duplicates by _id (or date if _id missing)
  const uniqueBookings = allBookings.filter((booking, index, self) =>
    index === self.findIndex(b =>
      booking._id ? b._id === booking._id : b.date === booking.date
    )
  );

  return generateReportPDF({
    title: "Booking Analytics Report",
    subtitle: "All Bookings (No Duplicates)",
    data: uniqueBookings,
    stats,
    filename: `booking-analytics-report-${Date.now()}.pdf`
  });
}

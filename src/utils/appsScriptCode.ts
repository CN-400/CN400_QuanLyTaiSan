export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT BACKEND API FOR ASSET MANAGEMENT
 * Tên dự án: Hệ thống Quản lý Đăng ký Sửa chữa & Mua sắm Tài sản
 * Tương thích Google Sheets + Web App API
 */

function doGet(e) {
  try {
    var action = e && e.parameter ? e.parameter.action : "";
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (!ss) {
      return responseJSON({ status: "error", message: "Không tìm thấy Spreadsheet. Hãy gắn script vào Google Sheet." });
    }
    
    if (action === "getAll") {
      var scSheet = ss.getSheetByName("SuaChua");
      var msSheet = ss.getSheetByName("MuaSam");
      
      var scData = scSheet ? sheetToObjects(scSheet) : [];
      var msData = msSheet ? sheetToObjects(msSheet) : [];
      
      return responseJSON({
        status: "success",
        suaChua: scData,
        muaSam: msData
      });
    }
    
    return responseJSON({
      status: "success",
      message: "Google Apps Script Web App API đang hoạt động bình thường!",
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return responseJSON({ status: "error", message: "Dữ liệu gửi lên rỗng." });
    }

    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var data = contents.data;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Tự động khởi tạo hoặc lấy sheet
    var scSheet = getOrCreateSheet(ss, "SuaChua", [
      "Mã đề nghị", "Họ và tên", "Phòng ban", "Tên tài sản", "Tình trạng", 
      "Ngày báo hỏng", "Đề xuất", "Mức độ khẩn cấp", "Trạng thái", 
      "Cán bộ xử lý", "Ngày hoàn thành", "Ghi chú", "Thời gian khởi tạo"
    ]);
    
    var msSheet = getOrCreateSheet(ss, "MuaSam", [
      "Mã đề nghị", "Họ và tên", "Phòng ban", "Tên thiết bị", "Số lượng", 
      "Chủng loại", "Lý do đề xuất", "Mô tả yêu cầu", "Ngày đề nghị", 
      "Đề xuất thời gian mua", "Cán bộ xử lý", "Trạng thái", "Ngày hoàn thành", "Ghi chú", "Thời gian khởi tạo"
    ]);
    
    // 1. Thêm mới Yêu cầu Sửa chữa
    if (action === "createRepair") {
      scSheet.appendRow([
        data.id || "",
        data.fullName || "",
        data.department || "",
        data.assetName || "",
        data.condition || "",
        data.reportDate || "",
        data.proposal || "",
        data.urgency || "Trung Bình",
        data.status || "Đề xuất",
        data.handler || "",
        data.completionDate || "",
        data.note || "",
        new Date().toLocaleString("vi-VN")
      ]);
      return responseJSON({ status: "success", message: "Đã lưu phiếu sửa chữa vào Google Sheets thành công!", id: data.id });
    }
    
    // 2. Thêm mới Yêu cầu Mua sắm
    if (action === "createProcurement") {
      msSheet.appendRow([
        data.id || "",
        data.fullName || "",
        data.department || "",
        data.equipmentName || "",
        data.quantity || 1,
        data.category || "",
        data.reason || "",
        data.description || "",
        data.requestDate || "",
        data.proposedDate || "",
        data.handler || "",
        data.status || "Đề xuất",
        data.completionDate || "",
        data.note || "",
        new Date().toLocaleString("vi-VN")
      ]);
      return responseJSON({ status: "success", message: "Đã lưu phiếu mua sắm vào Google Sheets thành công!", id: data.id });
    }
    
    // 3. Cập nhật trạng thái xử lý
    if (action === "updateStatus") {
      var isRepair = contents.type === "repair";
      var targetSheet = isRepair ? scSheet : msSheet;
      var rows = targetSheet.getDataRange().getValues();
      var found = false;
      
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.id) {
          if (isRepair) {
            // Col 9: Trạng thái, Col 10: Cán bộ, Col 11: Ngày hoàn thành, Col 12: Ghi chú
            if (data.status) targetSheet.getRange(i + 1, 9).setValue(data.status);
            if (data.handler !== undefined) targetSheet.getRange(i + 1, 10).setValue(data.handler);
            if (data.completionDate !== undefined) targetSheet.getRange(i + 1, 11).setValue(data.completionDate);
            if (data.note !== undefined) targetSheet.getRange(i + 1, 12).setValue(data.note);
          } else {
            // Col 11: Cán bộ, Col 12: Trạng thái, Col 13: Ngày hoàn thành, Col 14: Ghi chú
            if (data.handler !== undefined) targetSheet.getRange(i + 1, 11).setValue(data.handler);
            if (data.status) targetSheet.getRange(i + 1, 12).setValue(data.status);
            if (data.completionDate !== undefined) targetSheet.getRange(i + 1, 13).setValue(data.completionDate);
            if (data.note !== undefined) targetSheet.getRange(i + 1, 14).setValue(data.note);
          }
          found = true;
          break;
        }
      }
      return responseJSON({ 
        status: found ? "success" : "not_found", 
        message: found ? "Đã cập nhật trạng thái đề nghị thành công!" : "Không tìm thấy mã đề nghị trong sheet." 
      });
    }

    return responseJSON({ status: "error", message: "Hành động không hợp lệ: " + action });
  } catch (err) {
    return responseJSON({ status: "error", message: "Lỗi hệ thống Apps Script: " + err.toString() });
  }
}

// Hàm hỗ trợ tạo hoặc định dạng Sheet
function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#002060").setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// Chuyển dòng dữ liệu sheet thành Mảng đối tượng JSON
function sheetToObjects(sheet) {
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var result = [];
  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    result.push(obj);
  }
  return result;
}

// Trả về định dạng JSON chuẩn
function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
`;

export const INSTRUCTIONS_STEPS = [
  {
    step: 1,
    title: 'Tạo Google Sheet mới',
    content: 'Truy cập drive.google.com -> Tạo mới Google Sheet. Đặt tên file ví dụ: "QuanLyTaiSan_NganHang".',
  },
  {
    step: 2,
    title: 'Thêm 2 Trang tính (Sheets)',
    content: 'Đổi tên Sheet 1 thành "SuaChua". Tạo thêm 1 Sheet mới và đổi tên thành "MuaSam". (Nếu không tự đổi, Script sẽ tự tạo giúp bạn).',
  },
  {
    step: 3,
    title: 'Mở Trình biên tập Apps Script',
    content: 'Trên thanh menu Google Sheet, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.',
  },
  {
    step: 4,
    title: 'Dán đoạn mã Code.gs',
    content: 'Xóa toàn bộ mã mặc định trong file Code.gs, dán đoạn mã Google Apps Script ở khung bên cạnh vào.',
  },
  {
    step: 5,
    title: 'Triển khai dưới dạng Web App',
    content: 'Nhấp nút "Triển khai" (Deploy) ở góc trên bên phải -> Chọn "Triển khai mới" (New deployment) -> Chọn biểu tượng bánh răng bên cạnh "Chọn loại", chọn "Ứng dụng Web" (Web app).',
  },
  {
    step: 6,
    title: 'Phân quyền truy cập',
    content: 'Mô tả: API Tai San. Thực thi dưới dạng: "Tôi" (Me). Ai có quyền truy cập: "Bất kỳ ai" (Anyone). Sau đó nhấn "Triển khai".',
  },
  {
    step: 7,
    title: 'Sao chép Web App URL',
    content: 'Cấp quyền cho ứng dụng khi Google hỏi. Sau khi hoàn tất, copy đường link Web App URL (có dạng https://script.google.com/macros/s/.../exec) và dán vào phần Cài đặt của Web App này.',
  },
];

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT BACKEND API FOR ASSET MANAGEMENT
 * Tên dự án: Hệ thống Quản lý Đăng ký Sửa chữa & Mua sắm Tài sản
 * Đơn vị: VIETINBANK CHI NHÁNH NINH BÌNH
 * Tính năng: Lưu dữ liệu Google Sheets + Tự động gửi Email thông báo cho Cán bộ Quản lý
 */

// Email nhận thông báo mặc định (Phân cách bằng dấu phẩy nếu gửi cho nhiều người)
var DEFAULT_MANAGER_EMAILS = "qlts.ninhbinh@vietinbank.vn";

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
      message: "Google Apps Script Web App API VietinBank đang hoạt động bình thường!",
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
    // Lấy email từ cài đặt web app gửi lên, nếu trống thì dùng mặc định
    var recipientEmail = (contents.managerEmail && contents.managerEmail.trim()) 
      ? contents.managerEmail.trim() 
      : DEFAULT_MANAGER_EMAILS;

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
      var createdAtStr = new Date().toLocaleString("vi-VN");
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
        createdAtStr
      ]);

      // Tự động gửi mail thông báo cho Cán bộ Quản lý
      sendEmailNotificationForRepair(recipientEmail, data, createdAtStr);

      return responseJSON({ 
        status: "success", 
        message: "Đã lưu phiếu sửa chữa vào Google Sheets & gửi email thông báo thành công!", 
        id: data.id 
      });
    }
    
    // 2. Thêm mới Yêu cầu Mua sắm
    if (action === "createProcurement") {
      var createdAtStr = new Date().toLocaleString("vi-VN");
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
        createdAtStr
      ]);

      // Tự động gửi mail thông báo cho Cán bộ Quản lý
      sendEmailNotificationForProcurement(recipientEmail, data, createdAtStr);

      return responseJSON({ 
        status: "success", 
        message: "Đã lưu phiếu mua sắm vào Google Sheets & gửi email thông báo thành công!", 
        id: data.id 
      });
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
            if (data.status) targetSheet.getRange(i + 1, 9).setValue(data.status);
            if (data.handler !== undefined) targetSheet.getRange(i + 1, 10).setValue(data.handler);
            if (data.completionDate !== undefined) targetSheet.getRange(i + 1, 11).setValue(data.completionDate);
            if (data.note !== undefined) targetSheet.getRange(i + 1, 12).setValue(data.note);
          } else {
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

/**
 * Gửi email thông báo Đề nghị Sửa chữa tới Cán bộ Quản lý
 */
function sendEmailNotificationForRepair(recipientEmail, data, timestamp) {
  if (!recipientEmail || recipientEmail.trim() === "") return;
  try {
    var subject = "[VIETINBANK NINH BÌNH] Đề nghị SỬA CHỮA mới - " + (data.id || "") + " (" + (data.fullName || "") + ")";
    var htmlBody = '<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #002060; border-radius: 8px; overflow: hidden;">' +
      '<div style="background-color: #002060; padding: 16px; text-align: center; color: #ffffff;">' +
      '<h2 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px;">VIETINBANK CHI NHÁNH NINH BÌNH</h2>' +
      '<p style="margin: 4px 0 0 0; font-size: 13px; color: #facc15; font-weight: bold;">THÔNG BÁO ĐỀ NGHỊ SỬA CHỮA TÀI SẢN MỚI</p>' +
      '</div>' +
      '<div style="padding: 20px; line-height: 1.6; font-size: 14px;">' +
      '<p>Kính gửi <b>Cán bộ Quản lý / Bộ phận Quản trị Tài sản</b>,</p>' +
      '<p>Hệ thống vừa tiếp nhận 01 phiếu đăng ký sửa chữa tài sản mới với thông tin chi tiết như sau:</p>' +
      '<table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold; width: 38%;">Mã đề nghị:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #002060;">' + (data.id || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Họ và tên cán bộ:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.fullName || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Phòng ban / Đơn vị:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.department || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Tên tài sản / Thiết bị:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">' + (data.assetName || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Tình trạng hỏng hóc:</td><td style="padding: 8px; border: 1px solid #ddd; color: #dc2626;">' + (data.condition || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Đề xuất xử lý:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.proposal || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Mức độ khẩn cấp:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #b91c1c;">' + (data.urgency || 'Trung Bình') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Ngày báo hỏng:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.reportDate || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Thời gian gửi:</td><td style="padding: 8px; border: 1px solid #ddd;">' + timestamp + '</td></tr>' +
      '</table>' +
      '<p style="margin-top: 20px;">Trân trọng kính báo Cán bộ Quản lý xem xét, duyệt và phân công xử lý kịp thời.</p>' +
      '</div>' +
      '<div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">' +
      'Email tự động từ Ứng dụng Đăng ký Sửa chữa & Mua sắm VietinBank Ninh Bình.' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (err) {
    Logger.log("Lỗi gửi email sửa chữa: " + err.toString());
  }
}

/**
 * Gửi email thông báo Đề nghị Mua sắm tới Cán bộ Quản lý
 */
function sendEmailNotificationForProcurement(recipientEmail, data, timestamp) {
  if (!recipientEmail || recipientEmail.trim() === "") return;
  try {
    var subject = "[VIETINBANK NINH BÌNH] Đề nghị MUA SẮM mới - " + (data.id || "") + " (" + (data.fullName || "") + ")";
    var htmlBody = '<div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; border: 1px solid #002060; border-radius: 8px; overflow: hidden;">' +
      '<div style="background-color: #002060; padding: 16px; text-align: center; color: #ffffff;">' +
      '<h2 style="margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px;">VIETINBANK CHI NHÁNH NINH BÌNH</h2>' +
      '<p style="margin: 4px 0 0 0; font-size: 13px; color: #facc15; font-weight: bold;">THÔNG BÁO ĐỀ NGHỊ MUA SẮM THIẾT BỊ MỚI</p>' +
      '</div>' +
      '<div style="padding: 20px; line-height: 1.6; font-size: 14px;">' +
      '<p>Kính gửi <b>Cán bộ Quản lý / Bộ phận Quản trị Tài sản</b>,</p>' +
      '<p>Hệ thống vừa tiếp nhận 01 phiếu đăng ký mua sắm thiết bị mới với thông tin chi tiết như sau:</p>' +
      '<table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px;">' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold; width: 38%;">Mã đề nghị:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #002060;">' + (data.id || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Họ và tên cán bộ:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.fullName || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Phòng ban / Đơn vị:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.department || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Tên thiết bị đề nghị:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">' + (data.equipmentName || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Số lượng:</td><td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; color: #15803d;">' + (data.quantity || 1) + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Chủng loại / Quy cách:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.category || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Lý do đề xuất:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.reason || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Mô tả yêu cầu kỹ thuật:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.description || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Thời gian đề xuất mua:</td><td style="padding: 8px; border: 1px solid #ddd;">' + (data.proposedDate || '') + '</td></tr>' +
      '<tr><td style="padding: 8px; border: 1px solid #ddd; background: #f8f9fa; font-weight: bold;">Thời gian gửi:</td><td style="padding: 8px; border: 1px solid #ddd;">' + timestamp + '</td></tr>' +
      '</table>' +
      '<p style="margin-top: 20px;">Trân trọng kính báo Cán bộ Quản lý xem xét, duyệt và thẩm định kế hoạch mua sắm.</p>' +
      '</div>' +
      '<div style="background-color: #f1f5f9; padding: 12px; text-align: center; font-size: 11px; color: #64748b;">' +
      'Email tự động từ Ứng dụng Đăng ký Sửa chữa & Mua sắm VietinBank Ninh Bình.' +
      '</div>' +
      '</div>';

    MailApp.sendEmail({
      to: recipientEmail,
      subject: subject,
      htmlBody: htmlBody
    });
  } catch (err) {
    Logger.log("Lỗi gửi email mua sắm: " + err.toString());
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
    content: 'Truy cập drive.google.com -> Tạo mới Google Sheet. Đặt tên file ví dụ: "QuanLyTaiSan_VietinBank_NinhBinh".',
  },
  {
    step: 2,
    title: 'Thêm 2 Trang tính (Sheets)',
    content: 'Đổi tên Sheet 1 thành "SuaChua". Tạo thêm 1 Sheet mới và đổi tên thành "MuaSam". (Nếu chưa tạo, Script sẽ tự tạo giúp bạn).',
  },
  {
    step: 3,
    title: 'Mở Trình biên tập Apps Script',
    content: 'Trên thanh menu Google Sheet, chọn: Tiện ích mở rộng (Extensions) -> Apps Script.',
  },
  {
    step: 4,
    title: 'Dán đoạn mã Code.gs & Cấu hình Email',
    content: 'Xóa toàn bộ mã mặc định trong file Code.gs, dán đoạn mã Google Apps Script ở khung bên cạnh vào. Bạn có thể thay đổi biến DEFAULT_MANAGER_EMAILS ở dòng 9 thành email nhận thông báo của cán bộ quản lý (phân cách bằng dấu phẩy nếu gửi cho nhiều người).',
  },
  {
    step: 5,
    title: 'Triển khai dưới dạng Web App',
    content: 'Nhấp nút "Triển khai" (Deploy) ở góc trên bên phải -> Chọn "Triển khai mới" (New deployment) -> Chọn biểu tượng bánh răng, chọn "Ứng dụng Web" (Web app).',
  },
  {
    step: 6,
    title: 'Phân quyền truy cập & cấp quyền gửi mail',
    content: 'Mô tả: API Tai San VietinBank. Thực thi dưới dạng: "Tôi" (Me). Ai có quyền truy cập: "Bất kỳ ai" (Anyone). Khi được hỏi cấp quyền truy cập Gmail/Mail, chọn "Đồng ý" (Allow) để Script có thể tự động gửi email thông báo khi có phiếu mới.',
  },
  {
    step: 7,
    title: 'Sao chép Web App URL & cấu hình ứng dụng',
    content: 'Sau khi hoàn tất triển khai, copy đường link Web App URL (có dạng https://script.google.com/macros/s/.../exec) và dán vào phần Cài đặt của Web App này.',
  },
];

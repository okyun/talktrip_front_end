import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCustomLogin } from '../../../common/hook/useCustomLogin';
import MessagePopup from '../../../common/components/MessagePopup';
import SuccessModal from '../../../components/SuccessModal';

const MyInfo = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { memberId, isLogin, loginState } = useCustomLogin();

  const authHeader = () =>
    loginState?.accessToken ? { Authorization: `Bearer ${loginState.accessToken}` } : {};

  const [countryCode, setCountryCode] = useState('+82');
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');

  const [form, setForm] = useState({
    memberId: '',
    account_email: '',
    gender: '',
    birthday: '',
    name: '',
    nickname: '',
  });

  const [profileImageFile, setProfileImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showMessagePopup, setShowMessagePopup] = useState(false);
  const [messageData, setMessageData] = useState({ message: '', type: 'info' });
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 전화번호에서 국가코드와 나머지 번호 분리하는 함수 (하이픈 제거)
  const splitPhoneNumber = (phoneNum) => {
    if (!phoneNum) return { countryCode: '+82', localNumber: '' };

    const parts = phoneNum.trim().split(' ');
    if (parts.length === 2) {
      const countryCode = parts[0];
      const localNumber = parts[1].replace(/-/g, ''); // 하이픈 제거
      return { countryCode, localNumber };
    } else {
      return {
        countryCode: '+82',
        localNumber: phoneNum.replace(/-/g, ''),
      };
    }
  };

  // 프로필 정보 불러오기
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch('/api/member/me', {
          method: 'GET',
          headers: authHeader(),
          credentials: 'include',
        });
        if (!res.ok) throw new Error('프로필 조회 실패');
        const data = await res.json();

        const { countryCode, localNumber } = splitPhoneNumber(data.phoneNum || '');

        setCountryCode(countryCode);
        setLocalPhoneNumber(localNumber); // 숫자만 저장

        setForm({
          memberId: data.memberId || '',
          account_email: data.accountEmail || '',
          gender: data.gender || '',
          birthday: data.birthday || '',
          name: data.name || '',
          nickname: data.nickname || '',
        });
        setPreviewUrl(data.profileImage || '');
              } catch (err) {
          console.error(err);
          setMessageData({ message: '프로필 정보를 불러오는 데 실패했습니다.', type: 'error' });
          setShowMessagePopup(true);
        } finally {
        setLoading(false);
      }
    };

    if (!isLogin) {
      setMessageData({ message: '로그인이 필요합니다.', type: 'warning' });
      setShowMessagePopup(true);
      navigate('/');
      return;
    }

    if (memberId) {
      fetchProfile();
    }
  }, [memberId, isLogin, navigate, loginState?.accessToken]);

  // forceRefresh 상태 감지 및 데이터 재로드
  useEffect(() => {
    if (location.state?.forceRefresh && memberId && isLogin) {
      console.log('MyInfo 컴포넌트 새로고침 감지');
      const fetchProfile = async () => {
        try {
          const res = await fetch('/api/member/me', {
            method: 'GET',
            headers: authHeader(),
            credentials: 'include',
          });
          if (!res.ok) throw new Error('프로필 조회 실패');
          const data = await res.json();

          const { countryCode, localNumber } = splitPhoneNumber(data.phoneNum || '');

          setCountryCode(countryCode);
          setLocalPhoneNumber(localNumber);

          setForm({
            memberId: data.memberId || '',
            account_email: data.accountEmail || '',
            gender: data.gender || '',
            birthday: data.birthday || '',
            name: data.name || '',
            nickname: data.nickname || '',
          });
          setPreviewUrl(data.profileImage || '');
        } catch (err) {
          console.error(err);
          setMessageData({ message: '프로필 정보를 불러오는 데 실패했습니다.', type: 'error' });
          setShowMessagePopup(true);
        }
      };
      
      fetchProfile();
    }
  }, [location.state, memberId, isLogin, loginState?.accessToken]);

  // 입력값 변경 처리 (전화번호는 따로 처리)
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone_num') {
      // 전화번호는 여기서 바로 state 업데이트하지 않음 (로컬번호 별도 관리)
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 전화번호 로컬번호 입력 핸들링 (숫자만 받음)
  const handleLocalPhoneChange = (e) => {
    const value = e.target.value;
    const cleaned = value.replace(/[^0-9]/g, ''); // 숫자만 필터링
    setLocalPhoneNumber(cleaned);
  };

  // 이미지 변경 핸들링
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setProfileImageFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // 폼 제출 시 전화번호 합쳐서 서버 전송
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // 수정할 정보들을 JSON 객체로 만듦
      const updateData = {
        name: form.name,
        gender: form.gender,
        birthday: form.birthday,
        phoneNum: `${countryCode} ${localPhoneNumber}`,
      };

      const formData = new FormData();
      // 'info'라는 키에 JSON 형태를 Blob으로 감싸서 넣어줘야 함
      formData.append('info', new Blob([JSON.stringify(updateData)], { type: 'application/json' }));

      if (profileImageFile) {
        formData.append('profile_image', profileImageFile);
      }

      const res = await fetch('/api/member/me', {
        method: 'PUT',
        body: formData,
        credentials: 'include',
        headers: authHeader(),
      });

      if (!res.ok) throw new Error('프로필 업데이트 실패');
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setMessageData({ message: '프로필 수정 중 오류가 발생했습니다.', type: 'error' });
      setShowMessagePopup(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-center">로딩 중…</div>;
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
  };

  return (
    <div className="h-fit bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-3xl mx-auto">
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        message="프로필이 성공적으로 수정되었습니다."
      />
      
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          내 정보 수정
        </h1>
        <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full"></div>
        <p className="text-gray-600 mt-4">프로필 정보를 수정하고 관리하세요</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 프로필 이미지 및 기본 정보 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-8 hover:shadow-xl transition-all duration-300">
          <div className="flex items-start gap-8">
            <div className="flex flex-col items-center">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                {previewUrl ? (
                  <img src={previewUrl} alt="프로필 미리보기" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-500 text-sm">
                    이미지 없음
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-300">
                  <label className="cursor-pointer bg-black bg-opacity-50 hover:bg-opacity-70 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105">
                    사진 변경
                    <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">이름</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  placeholder="이름을 입력하세요"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">성별</label>
                <div className="flex gap-6 mt-2">
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="gender"
                      value="M"
                      checked={form.gender === 'M'}
                      onChange={handleChange}
                      className="mr-3 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 group-hover:text-blue-600 transition-colors duration-200">남성</span>
                  </label>
                  <label className="flex items-center cursor-pointer group">
                    <input
                      type="radio"
                      name="gender"
                      value="F"
                      checked={form.gender === 'F'}
                      onChange={handleChange}
                      className="mr-3 w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 group-hover:text-blue-600 transition-colors duration-200">여성</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 계정 정보 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-8 hover:shadow-xl transition-all duration-300">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            계정 정보
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-semibold text-gray-700">닉네임</label>
              <input
                name="nickname"
                value={form.nickname}
                readOnly
                className="flex-1 bg-gray-100 border border-gray-300 px-4 py-3 rounded-xl text-gray-600"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-semibold text-gray-700">이메일</label>
              <input
                name="account_email"
                type="email"
                value={form.account_email}
                readOnly
                className="flex-1 bg-gray-100 border border-gray-300 px-4 py-3 rounded-xl text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* 개인 정보 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/30 p-8 hover:shadow-xl transition-all duration-300">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            개인 정보
          </h3>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-semibold text-gray-700">생년월일</label>
              <input
                name="birthday"
                type="date"
                value={form.birthday || ''}
                onChange={handleChange}
                className="flex-1 border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-semibold text-gray-700">전화번호</label>
              <div className="flex gap-3 flex-1">
                <input
                  type="text"
                  value={countryCode}
                  readOnly
                  className="w-20 border border-gray-300 px-3 py-3 rounded-xl bg-gray-100 text-center text-gray-600 font-medium"
                />
                <input
                  name="phone_num"
                  type="tel"
                  value={localPhoneNumber}
                  onChange={handleLocalPhoneChange}
                  className="flex-1 border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/80 backdrop-blur-sm"
                  placeholder="예: 01012345678"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center space-x-2 hover:scale-105"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>수정 중…</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>수정하기</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* 메시지 팝업 */}
      <MessagePopup
        isOpen={showMessagePopup}
        onClose={() => setShowMessagePopup(false)}
        message={messageData.message}
        type={messageData.type}
      />
      </div>
    </div>
  );
};

export default MyInfo;

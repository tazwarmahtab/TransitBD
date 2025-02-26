import i18n from 'i18next';
import { initReactI18next, useTranslation as useI18nTranslation } from 'react-i18next';

const resources = {
  en: {
    translation: {
      login: 'Login',
      toggle_language: 'Toggle Language',
      navigation: {
        live_map: 'Live Map',
        transit_card: 'Transit Card',
        logout: 'Logout'
      },
      hero: {
        title: 'Your One-Stop Transit Solution for Bangladesh',
        subtitle: 'Book rides, track public transport, and manage payments - all in one app with voice assistance in Bengali and English.',
        cta: 'Join Waitlist',
        secondary_cta: 'Sign In',
      },
      features: {
        title: 'Everything You Need for Seamless Transit',
        navigation: {
          title: 'Smart Navigation',
          description: 'Real-time tracking and intelligent route planning for all transport modes',
        },
        voice: {
          title: 'Voice Assistant',
          description: 'Natural language commands in Bengali and English for hands-free operation',
        },
        payments: {
          title: 'Digital Payments',
          description: 'Seamless integration with BKash, Nagad and other popular payment methods',
        },
        realtime: {
          title: 'Live Updates',
          description: 'Get real-time ETAs and service updates for your journey',
        },
        multimodal: {
          title: 'All Transport Modes',
          description: 'From buses to CNGs, access every transport option in one place',
        },
        language: {
          title: 'Bilingual Support',
          description: 'Full support for both Bengali and English languages',
        }
      },
      waitlist: {
        title: 'Be the First to Experience',
        subtitle: 'Join our waitlist to get early access when we launch',
        placeholder: 'Enter your email',
        submit: 'Join Waitlist',
        submitting: 'Joining...',
        success: {
          title: 'Thank you for joining!',
          description: 'We\'ll notify you when we launch.',
        },
        error: {
          title: 'Something went wrong',
        }
      },
      route: {
        next_departure: 'Next Departure',
        book_now: 'Book Now'
      },
      transit_card: {
        balance: 'Card Balance',
        card_number: 'Card Number',
        top_up: 'Top Up',
        amount: 'Amount',
        transactions: 'Transaction History',
        topup: 'Top Up',
        payment: 'Payment',
        top_up_success: 'Top Up Successful',
        top_up_success_description: 'Your balance has been updated.',
        top_up_error: 'Top Up Failed'
      },
      physical_card: {
        order_card: 'Order Physical Card',
        order_title: 'Order Your TransitBD Card',
        order_description: 'Get a physical card delivered to your doorstep. Use it for contactless payments across all supported transport.',
        address: 'Street Address',
        address_placeholder: 'Enter your street address',
        city: 'City',
        city_placeholder: 'Enter your city',
        postal_code: 'Postal Code',
        postal_code_placeholder: 'Enter postal code',
        phone_number: 'Phone Number',
        phone_number_placeholder: 'Enter your phone number',
        submit_order: 'Place Order',
        order_success: 'Order Placed Successfully',
        order_success_description: 'Your physical card will be delivered within 3-5 business days.',
        order_error: 'Failed to Place Order',
        orders: 'My Card Orders',
        order_status: {
          PENDING: 'Processing',
          SHIPPED: 'Shipped',
          DELIVERED: 'Delivered'
        }
      },
      dashboard: {
        view_transit_card: 'View Transit Card',
        find_nearest: 'Find Nearest Stop'
      }
    }
  },
  bn: {
    translation: {
      login: 'লগইন',
      toggle_language: 'ভাষা পরিবর্তন করুন',
      navigation: {
        live_map: 'লাইভ ম্যাপ',
        transit_card: 'ট্রানজিট কার্ড',
        logout: 'লগআউট'
      },
      hero: {
        title: 'বাংলাদেশের জন্য সম্পূর্ণ পরিবহন সমাধান',
        subtitle: 'রাইড বুক করুন, পাবলিক ট্রান্সপোর্ট ট্র্যাক করুন, এবং পেমেন্ট করুন - সবকিছু একটি অ্যাপে ভয়েস সহায়তার সাথে।',
        cta: 'অপেক্ষমান তালিকায় যোগ দিন',
        secondary_cta: 'সাইন ইন',
      },
      features: {
        title: 'নিরবচ্ছিন্ন যাতায়াতের জন্য সব কিছু',
        navigation: {
          title: 'স্মার্ট নেভিগেশন',
          description: 'সব ধরনের পরিবহনের জন্য রিয়েল-টাইম ট্র্যাকিং এবং বুদ্ধিমান রুট প্ল্যানিং',
        },
        voice: {
          title: 'ভয়েস অ্যাসিস্ট্যান্ট',
          description: 'বাংলা এবং ইংরেজিতে প্রাকৃতিক ভাষায় কমান্ড',
        },
        payments: {
          title: 'ডিজিটাল পেমেন্ট',
          description: 'বিকাশ, নগদ এবং অন্যান্য জনপ্রিয় পেমেন্ট পদ্ধতির সাথে সহজ ইন্টিগ্রেশন',
        },
        realtime: {
          title: 'লাইভ আপডেট',
          description: 'আপনার যাত্রার জন্য রিয়েল-টাইম ইটিএ এবং সার্ভিস আপডেট পান',
        },
        multimodal: {
          title: 'সব ধরনের পরিবহন',
          description: 'বাস থেকে সিএনজি, সব ধরনের পরিবহন একই জায়গায়',
        },
        language: {
          title: 'দ্বিভাষিক সমর্থন',
          description: 'বাংলা এবং ইংরেজি উভয় ভাষার পূর্ণ সমর্থন',
        }
      },
      waitlist: {
        title: 'প্রথম অভিজ্ঞতা নিন',
        subtitle: 'আমাদের লঞ্চের সময় প্রথমে অ্যাক্সেস পেতে অপেক্ষমান তালিকায় যোগ দিন',
        placeholder: 'আপনার ইমেইল দিন',
        submit: 'যোগ দিন',
        submitting: 'যোগ দেওয়া হচ্ছে...',
        success: {
          title: 'যোগ দেওয়ার জন্য ধন্যবাদ!',
          description: 'আমরা লঞ্চ করলে আপনাকে জানাবো।',
        },
        error: {
          title: 'কিছু ভুল হয়েছে',
        }
      },
      route: {
        next_departure: 'পরবর্তী যাত্রা',
        book_now: 'বুক করুন'
      },
      transit_card: {
        balance: 'কার্ড ব্যালেন্স',
        card_number: 'কার্ড নম্বর',
        top_up: 'টপ আপ',
        amount: 'পরিমাণ',
        transactions: 'লেনদেনের ইতিহাস',
        topup: 'টপ আপ',
        payment: 'পেমেন্ট',
        top_up_success: 'টপ আপ সফল হয়েছে',
        top_up_success_description: 'আপনার ব্যালেন্স আপডেট করা হয়েছে।',
        top_up_error: 'টপ আপ ব্যর্থ হয়েছে'
      },
      physical_card: {
        order_card: 'ফিজিক্যাল কার্ড অর্ডার করুন',
        order_title: 'আপনার ট্রানজিটবিডি কার্ড অর্ডার করুন',
        order_description: 'আপনার দরজায় একটি ফিজিক্যাল কার্ড পেতে অর্ডার করুন। সমস্ত সমর্থিত পরিবহনে কন্টাক্টলেস পেমেন্টের জন্য ব্যবহার করুন।',
        address: 'ঠিকানা',
        address_placeholder: 'আপনার ঠিকানা লিখুন',
        city: 'শহর',
        city_placeholder: 'আপনার শহরের নাম লিখুন',
        postal_code: 'পোস্টাল কোড',
        postal_code_placeholder: 'পোস্টাল কোড লিখুন',
        phone_number: 'ফোন নম্বর',
        phone_number_placeholder: 'আপনার ফোন নম্বর লিখুন',
        submit_order: 'অর্ডার করুন',
        order_success: 'অর্ডার সফল হয়েছে',
        order_success_description: '৩-৫ কার্যদিবসের মধ্যে আপনার ফিজিক্যাল কার্ড পৌঁছে দেওয়া হবে।',
        order_error: 'অর্ডার ব্যর্থ হয়েছে',
        orders: 'আমার কার্ড অর্ডার',
        order_status: {
          PENDING: 'প্রক্রিয়াধীন',
          SHIPPED: 'প্রেরিত',
          DELIVERED: 'পৌঁছে দেওয়া হয়েছে'
        }
      },
      dashboard: {
        view_transit_card: 'ট্রানজিট কার্ড দেখুন',
        find_nearest: 'নিকটবর্তী স্টপ খুঁজুন'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export const useTranslation = useI18nTranslation;
export default i18n;
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { AppStyles } from '../styles/createStyles';
import type { Memo, Translation } from '../types';

type MemoModalProps = {
  draftMemo: string;
  editingMemoId: string | null;
  hasMemos: boolean;
  memos: Memo[];
  onChangeDraftMemo: (value: string) => void;
  onClose: () => void;
  onDeleteMemo: (memoId: string) => void;
  onSaveMemo: () => void;
  onStartEditMemo: (memo: Memo) => void;
  onStartNewMemo: () => void;
  selectedDateTitle: string;
  styles: AppStyles;
  text: Translation;
  visible: boolean;
};

export function MemoModal({
  draftMemo,
  editingMemoId,
  hasMemos,
  memos,
  onChangeDraftMemo,
  onClose,
  onDeleteMemo,
  onSaveMemo,
  onStartEditMemo,
  onStartNewMemo,
  selectedDateTitle,
  styles,
  text,
  visible,
}: MemoModalProps) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.stickyModalCard}>
          <View style={styles.stickyTape} />
          <Text style={styles.modalTitle}>{selectedDateTitle}</Text>
          {hasMemos ? <Text style={styles.modalDescription}>{text.memoHelp}</Text> : null}

          {hasMemos ? (
            <ScrollView style={styles.memoList} contentContainerStyle={styles.memoListContent}>
              <Text style={styles.sectionTitle}>
                {text.memoListTitle} · {text.memoCount(memos.length)}
              </Text>
              {memos.map((memo) => (
                <Pressable
                  accessibilityLabel={text.edit}
                  accessibilityRole="button"
                  key={memo.id}
                  onPress={() => onStartEditMemo(memo)}
                  style={({ pressed }) => [styles.memoListItem, pressed && styles.pressed]}
                >
                  <Text style={styles.memoListText}>{memo.text}</Text>
                  <Pressable
                    accessibilityLabel={text.delete}
                    accessibilityRole="button"
                    hitSlop={10}
                    onPress={() => onDeleteMemo(memo.id)}
                    style={({ pressed }) => [
                      styles.memoDeleteButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.memoDeleteText}>×</Text>
                  </Pressable>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}

          {editingMemoId ? (
            <View style={styles.editorCard}>
              {hasMemos || editingMemoId !== 'new' ? (
                <Text style={styles.sectionTitle}>
                  {editingMemoId === 'new' ? text.newMemoTitle : text.editMemoTitle}
                </Text>
              ) : null}
              <TextInput
                autoFocus
                multiline
                onChangeText={onChangeDraftMemo}
                placeholder={text.memoPlaceholder}
                placeholderTextColor="#a16207"
                style={styles.memoInput}
                textAlignVertical="top"
                value={draftMemo}
              />
            </View>
          ) : null}

          <View style={styles.modalActions}>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryButtonText}>{text.close}</Text>
            </Pressable>
            {editingMemoId ? (
              <Pressable
                accessibilityRole="button"
                onPress={onSaveMemo}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>
                  {editingMemoId === 'new' ? text.save : text.update}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={onStartNewMemo}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.primaryButtonText}>{text.addMemo}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
